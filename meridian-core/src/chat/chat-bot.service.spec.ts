import {
  ChatBotService,
  detectIntent,
  findTrackingId,
} from './chat-bot.service';

/* A fake shipment table: one in transit, one on hold. */
const shipments: Record<string, object> = {
  CP123456785US: {
    trackingId: 'CP123456785US',
    status: 'in_transit',
    currentLocation: { city: 'Memphis, TN' },
    estimatedDelivery: new Date('2026-10-21T00:00:00.000Z'),
    holdReason: null,
  },
  CP987654321US: {
    trackingId: 'CP987654321US',
    status: 'on_hold',
    currentLocation: { city: 'Louisville, KY' },
    estimatedDelivery: null,
    holdReason: 'Address needs confirming',
  },
};

const bookings: Record<string, { status: string }> = {
  'BR-261016-5Q8V': { status: 'pending' },
  'BR-261016-AB12': { status: 'approved' },
};

const prisma = {
  shipment: {
    findUnique: jest.fn(({ where }: { where: { trackingId: string } }) =>
      Promise.resolve(shipments[where.trackingId] ?? null),
    ),
  },
  shipmentRequest: {
    findUnique: jest.fn(({ where }: { where: { reference: string } }) =>
      Promise.resolve(bookings[where.reference] ?? null),
    ),
  },
};

const bot = new ChatBotService(prisma as never);
const ask = (text: string, state?: string, misses?: number) =>
  bot.process({ state, misses }, text);

describe('findTrackingId', () => {
  it('finds a tracking number inside a sentence', () => {
    expect(findTrackingId('hi, where is cp123456785us please?')).toBe(
      'CP123456785US',
    );
  });
  it('ignores phone numbers and ZIP codes', () => {
    expect(findTrackingId('call me on 5551234567')).toBeNull();
    expect(findTrackingId('ship from 90210 to 33139')).toBeNull();
  });
});

describe('detectIntent', () => {
  it.each([
    ['where is my package', 'track'],
    ['my parcel arrived damaged', 'problem'],
    ['it still has not arrived', 'delay'],
    ['how much does it cost to ship food overnight', 'rates'],
    ['can I talk to someone', 'human'],
    ['do you ship to Canada', 'international'],
    ['should I use dry ice or gel packs', 'cold_chain'],
    ['how long does ground take', 'delivery_times'],
    ['thanks so much', 'thanks'],
    ['hello', 'greeting'],
    ['how do I book a shipment', 'book'],
    ['can you schedule a pickup', 'book'],
    ['I forgot my password', 'account'],
    ['how do I create an account', 'account'],
    ['where can I find my receipt', 'documents'],
    ['should I use ups or fedex', 'carriers'],
    ['wheres my packge', 'track'],
  ])('"%s" → %s', (text, intent) => {
    expect(detectIntent(text)).toBe(intent);
  });

  it('returns null for something unrelated', () => {
    expect(detectIntent('purple elephants dance')).toBeNull();
  });
});

describe('ChatBotService', () => {
  it('looks up a tracking number typed straight into a message', async () => {
    const r = await ask('where is CP123456785US?');
    expect(r.message).toContain('Status: In transit');
    expect(r.message).toContain('Memphis, TN');
    // UTC formatting: the stored date must not slip to the day before
    expect(r.message).toContain('Wednesday, October 21');
    expect(r.quickActions[0].value).toBe('link:/tracking?id=CP123456785US');
  });

  it('explains a hold and offers a person', async () => {
    const r = await ask('CP987654321US');
    expect(r.message).toContain('Address needs confirming');
    expect(r.quickActions.some((q) => q.value === 'talk_to_support')).toBe(
      true,
    );
  });

  it('says clearly when a tracking number is not found', async () => {
    const r = await ask('AB000000000US');
    expect(r.message).toContain("couldn't find");
  });

  it('asks for the number, then rejects something that is not one', async () => {
    const first = await ask('track my order');
    expect(first.newState).toBe('awaiting_tracking_id');
    const second = await ask('blue box', 'awaiting_tracking_id');
    expect(second.message).toContain("doesn't look like a tracking number");
  });

  it('lets someone change topic while it waits for a tracking number', async () => {
    const r = await ask(
      'actually how much does shipping cost',
      'awaiting_tracking_id',
    );
    expect(r.quickActions.some((q) => q.value === 'link:/rates')).toBe(true);
  });

  it('escalates to a person on request', async () => {
    const r = await ask('talk_to_support');
    expect(r.newState).toBe('escalate_to_human');
  });

  it('offers a person instead of looping after two misunderstandings', async () => {
    const first = await ask('purple elephants', 'awaiting_choice', 0);
    expect(first.newContext.misses).toBe(1);
    const second = await ask(
      'more elephants',
      'awaiting_choice',
      first.newContext.misses,
    );
    expect(second.message).toContain('rather not guess');
    expect(second.quickActions[0].value).toBe('talk_to_support');
  });

  it('resets the miss count once it understands again', async () => {
    const r = await ask('hello', 'awaiting_choice', 1);
    expect(r.newContext.misses).toBe(0);
  });

  it('reads a booking reference before mistaking it for a tracking number', async () => {
    const r = await ask('any news on BR-261016-5Q8V?');
    expect(r.message).toContain('with our team for review');
    expect(prisma.shipment.findUnique).not.toHaveBeenCalledWith({
      where: { trackingId: 'BR-261016-5Q8V' },
    });
  });

  it('gives a booking status without revealing its details', async () => {
    const r = await ask('br-261016-ab12');
    expect(r.message).toContain('approved');
    expect(r.message).not.toMatch(/CP\d{9}US/);
  });

  it('says clearly when a booking reference is not found', async () => {
    const r = await ask('BR-261016-ZZZZ');
    expect(r.message).toContain("couldn't find a booking");
  });

  it('understands emoji on their own', async () => {
    expect((await ask('👍')).message).toContain("You're welcome");
    expect((await ask('👋')).message).toContain("I'm the Bellmont assistant");
    expect((await ask('📦')).newState).toBe('awaiting_tracking_id');
  });

  it('points carrier questions at the UPS and FedEx guides', async () => {
    const r = await ask('which is better, UPS or FedEx?');
    expect(r.quickActions.map((q) => q.value)).toEqual(
      expect.arrayContaining([
        'link:/blog/ups-freight-shipping-guide',
        'link:/blog/fedex-freight-shipping-guide',
      ]),
    );
  });

  it('explains how to book and links the booking form', async () => {
    const r = await ask('I want to send a package');
    expect(r.quickActions[0].value).toBe('link:/account/ship');
  });

  it('links cold-chain questions to the guide', async () => {
    const r = await ask('how do I ship frozen seafood');
    expect(r.quickActions[0].value).toBe(
      'link:/blog/ship-temperature-sensitive-freight',
    );
  });
});
