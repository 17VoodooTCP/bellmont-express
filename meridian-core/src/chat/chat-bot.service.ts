import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/* The Bellmont support assistant.

   Deterministic by design: every answer comes from Bellmont's own pages or
   from the shipment database, so it can never invent a delivery date or a
   regulation. It understands intent from keywords and phrases rather than
   requiring menu clicks, spots tracking numbers anywhere in a message, and
   hands over to a person instead of looping when it does not understand.

   Quick actions whose value starts with "link:" open a page on the site; any
   other value is sent back as the visitor's next message. */

export type QuickAction = { label: string; value: string };

export type BotContext = { state?: string; misses?: number };

export type BotResponse = {
  message: string;
  quickActions: QuickAction[];
  newState: string;
  newContext: BotContext;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending pickup',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  on_hold: 'On hold',
};

/* After this many messages the assistant could not place, it stops guessing
   and offers a person. */
const MAX_MISSES = 2;

const ACT = {
  track: { label: 'Track a shipment', value: 'track_package' },
  person: { label: 'Talk to a person', value: 'talk_to_support' },
  rates: { label: 'Check rates', value: 'link:/rates' },
  pricing: { label: 'See pricing', value: 'link:/pricing' },
  demo: { label: 'Book a demo', value: 'link:/book-demo' },
  problem: { label: 'Report a problem', value: 'report_problem' },
  menu: { label: 'Something else', value: 'main_menu' },
} satisfies Record<string, QuickAction>;

const MAIN_MENU: QuickAction[] = [ACT.track, ACT.rates, ACT.problem, ACT.person];

type Intent =
  | 'greeting'
  | 'thanks'
  | 'goodbye'
  | 'human'
  | 'track'
  | 'delay'
  | 'problem'
  | 'rates'
  | 'pricing'
  | 'demo'
  | 'cold_chain'
  | 'international'
  | 'delivery_times'
  | 'contact'
  | 'menu';

/* Each intent lists words and phrases that point to it. Phrases score
   higher than single words, so "how much" beats a stray "much". Order breaks
   ties: earlier intents win. */
const INTENTS: { intent: Intent; terms: string[] }[] = [
  { intent: 'human', terms: ['talk_to_support', 'talk to support', 'talk to a person', 'talk to someone', 'real person', 'speak to', 'human', 'agent', 'representative', 'operator', 'customer service', 'call me', 'phone call'] },
  { intent: 'problem', terms: ['report a problem', 'report_problem', 'damaged', 'damage', 'broken', 'claim', 'refund', 'spoiled', 'spoilt', 'melted', 'arrived warm', 'thawed', 'leaking', 'wrong item', 'missing item', 'complaint', 'problem', 'issue'] },
  { intent: 'delay', terms: ['delivery_delay', 'not arrived', 'hasnt arrived', 'has not arrived', 'didnt arrive', 'did not arrive', 'still waiting', 'delayed', 'delay', 'late', 'stuck', 'lost'] },
  { intent: 'track', terms: ['track_package', 'where is my', 'wheres my', 'where is', 'tracking', 'track', 'status', 'shipment', 'package', 'parcel', 'order'] },
  { intent: 'rates', terms: ['how much', 'shipping cost', 'cost to ship', 'quote', 'rates', 'rate', 'price', 'cost', 'cheaper', 'cheapest'] },
  { intent: 'pricing', terms: ['pricing', 'plan', 'plans', 'subscription', 'monthly fee', 'fees'] },
  { intent: 'demo', terms: ['book a demo', 'demo', 'sales', 'sign up', 'get started', 'onboarding', 'set up an account'] },
  { intent: 'cold_chain', terms: ['dry ice', 'gel pack', 'cold chain', 'perishable', 'perishables', 'frozen', 'refrigerated', 'temperature', 'cold', 'seafood', 'food'] },
  { intent: 'international', terms: ['canada', 'international', 'customs', 'border', 'overseas', 'abroad', 'export', 'import'] },
  { intent: 'delivery_times', terms: ['how long', 'delivery time', 'transit time', 'overnight', 'next day', '2 day', 'two day', '2day', 'ground', 'express', 'when will', 'how fast'] },
  { intent: 'contact', terms: ['opening hours', 'business hours', 'hours', 'open', 'email', 'phone number', 'contact', 'address'] },
  { intent: 'thanks', terms: ['thank you', 'thanks', 'thank', 'cheers', 'appreciate'] },
  { intent: 'goodbye', terms: ['goodbye', 'bye', 'see you', 'thats all', "that's all", 'nothing else'] },
  { intent: 'greeting', terms: ['good morning', 'good afternoon', 'good evening', 'hello', 'hiya', 'hey', 'hi'] },
  { intent: 'menu', terms: ['main_menu', 'main menu', 'menu', 'help', 'options', 'something else'] },
];

/* Tracking numbers: the UPU S10 format the console issues (two letters,
   nine digits, two letters), then a looser fallback for carrier numbers. */
const S10 = /\b([A-Z]{2}\d{9}[A-Z]{2})\b/i;
const GENERIC_ID = /\b(?=[A-Z0-9-]*\d)(?=[A-Z0-9-]*[A-Z])[A-Z0-9-]{10,30}\b|\b\d{12,30}\b/i;

export function findTrackingId(text: string): string | null {
  const s10 = text.match(S10);
  if (s10) return s10[1].toUpperCase();
  const generic = text.match(GENERIC_ID);
  return generic ? generic[0].toUpperCase() : null;
}

function normalise(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9_\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

export function detectIntent(text: string): Intent | null {
  const t = normalise(text);
  let best: { intent: Intent; score: number } | null = null;
  for (const { intent, terms } of INTENTS) {
    let score = 0;
    for (const term of terms) {
      if (t.includes(` ${term} `)) score += term.includes(' ') ? 3 : 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { intent, score };
  }
  return best?.intent ?? null;
}

/* Delivery dates are stored as UTC midnight; formatting in UTC stops the day
   slipping backwards for anyone west of Greenwich. */
function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

@Injectable()
export class ChatBotService {
  constructor(private prisma: PrismaService) {}

  async process(context: BotContext, raw: string): Promise<BotResponse> {
    const state = context.state ?? 'greeting';
    const misses = context.misses ?? 0;
    const text = raw.trim();

    /* A tracking number anywhere in the message is answered directly,
       whatever the conversation was doing. */
    const id = findTrackingId(text);
    if (id) return this.lookup(id);

    if (state === 'awaiting_tracking_id') {
      const intent = detectIntent(text);
      if (intent && intent !== 'track' && intent !== 'delay') return this.answer(intent, 0);
      return this.reply(
        "That doesn't look like a tracking number. Bellmont tracking numbers look like CP123456785US — two letters, nine digits, two letters. You'll find yours in your shipping confirmation email.",
        [ACT.person, ACT.menu],
        'awaiting_tracking_id',
        0,
      );
    }

    if (state === 'awaiting_problem_description') {
      return this.reply(
        "Thank you — I've noted that for our team. If you have photos of the packaging or the contents, attach them here with the paperclip; they make a claim much faster. Would you like a person to pick this up now?",
        [{ label: 'Yes, connect me', value: 'talk_to_support' }, ACT.menu],
        'awaiting_choice',
        0,
      );
    }

    const intent = detectIntent(text);
    if (!intent) return this.miss(misses);
    return this.answer(intent, 0);
  }

  private reply(message: string, quickActions: QuickAction[], newState: string, misses: number): BotResponse {
    return { message, quickActions, newState, newContext: { state: newState, misses } };
  }

  private miss(misses: number): BotResponse {
    const next = misses + 1;
    if (next >= MAX_MISSES) {
      return this.reply(
        "I'm not quite following, and I'd rather not guess. Let me bring in a member of the team who can help properly.",
        [{ label: 'Yes, connect me', value: 'talk_to_support' }, ACT.track, ACT.rates],
        'awaiting_choice',
        next,
      );
    }
    return this.reply(
      "Sorry, I didn't catch that. I can track a shipment if you send its tracking number, help with rates, delivery times or cold-chain shipping, or connect you with a person.",
      MAIN_MENU,
      'awaiting_choice',
      next,
    );
  }

  private answer(intent: Intent, misses: number): BotResponse {
    switch (intent) {
      case 'greeting':
      case 'menu':
        return this.reply(
          "Hi! I'm the Bellmont assistant. Send me a tracking number and I'll look it up, or pick one of these.",
          MAIN_MENU, 'awaiting_choice', misses,
        );
      case 'thanks':
        return this.reply("You're welcome! Is there anything else I can help with?", [ACT.track, ACT.menu], 'awaiting_choice', misses);
      case 'goodbye':
        return this.reply('Thanks for chatting with Bellmont Express. Safe travels to your shipment!', [ACT.track], 'awaiting_choice', misses);
      case 'human':
        return this.reply(
          "I'm connecting you with a member of the team now. Stay on this page — they'll reply right here. We usually respond within an hour on weekdays.",
          [], 'escalate_to_human', misses,
        );
      case 'track':
        return this.reply(
          "Sure — what's the tracking number? It looks like CP123456785US and it's in your shipping confirmation email.",
          [], 'awaiting_tracking_id', misses,
        );
      case 'delay':
        return this.reply(
          "Sorry it's taking longer than expected. Send me the tracking number and I'll check exactly where it is and what's holding it up.",
          [], 'awaiting_tracking_id', misses,
        );
      case 'problem':
        return this.reply(
          "I'm sorry about that. Tell me what happened — for example, damaged packaging or a product that arrived warm — and include the tracking number if you have it.",
          [], 'awaiting_problem_description', misses,
        );
      case 'rates':
        return this.reply(
          "Our rate calculator compares overnight, 2-day and ground options for your route in a few seconds. Enter the ZIP codes and package size and it shows what you can save.",
          [ACT.rates, ACT.pricing, ACT.person], 'awaiting_choice', misses,
        );
      case 'pricing':
        return this.reply(
          "You'll find our plans and what each includes on the pricing page. If you'd like to talk through which fits your volume, a quick demo is the fastest way.",
          [ACT.pricing, ACT.demo], 'awaiting_choice', misses,
        );
      case 'demo':
        return this.reply(
          "Happy to show you around. Book a demo and tell us what you ship first — rates, cold chain, automation or tracking — and we'll focus on that.",
          [ACT.demo, ACT.pricing], 'awaiting_choice', misses,
        );
      case 'cold_chain':
        return this.reply(
          "For perishables, the key is matching the coolant to the product: dry ice keeps frozen goods frozen, while gel packs keep chilled goods cold without freezing them. Ship early in the week so a delay never strands a box over a weekend. Our full guide covers packaging, dry ice rules and testing.",
          [{ label: 'Read the cold-chain guide', value: 'link:/blog/ship-temperature-sensitive-freight' }, ACT.rates, ACT.person],
          'awaiting_choice', misses,
        );
      case 'international':
        return this.reply(
          "We can help with cross-border shipping. For Canada, plan for licensing, bilingual labels, customs paperwork and a little extra transit time. Our guide walks through each step.",
          [{ label: 'Read the Canada guide', value: 'link:/blog/ship-freight-to-canada' }, ACT.person],
          'awaiting_choice', misses,
        );
      case 'delivery_times':
        return this.reply(
          "It depends on the service and the distance: overnight and 2-day services are time-definite, while ground takes longer the further it travels. For an exact delivery date on your route, the rate calculator shows each option side by side. If you already shipped, send the tracking number for the live estimate.",
          [ACT.rates, ACT.track], 'awaiting_choice', misses,
        );
      case 'contact':
        return this.reply(
          "You can reach us right here, or by email at support@bellmontexpress.com. We usually respond within an hour on weekdays.",
          [ACT.person, ACT.track], 'awaiting_choice', misses,
        );
    }
  }

  private async lookup(trackingId: string): Promise<BotResponse> {
    const s = await this.prisma.shipment.findUnique({ where: { trackingId } });
    if (!s) {
      return this.reply(
        `I couldn't find a shipment with the tracking number ${trackingId}. Please check it against your confirmation email — it's easy to swap a letter and a number.`,
        [{ label: 'Try another number', value: 'track_package' }, ACT.person],
        'awaiting_choice',
        0,
      );
    }

    const status = STATUS_LABELS[s.status] ?? s.status;
    const where = (s.currentLocation as { city?: string } | null)?.city;
    const lines = [`Here's ${s.trackingId}:`, `Status: ${status}`];
    if (where && s.status !== 'delivered') lines.push(`Last seen: ${where}`);
    if (s.estimatedDelivery && s.status !== 'delivered') lines.push(`Estimated delivery: ${formatDate(s.estimatedDelivery)}`);

    let note = '';
    if (s.status === 'on_hold') note = s.holdReason ? `It's on hold: ${s.holdReason}.` : "It's on hold at the moment. A person can tell you why.";
    else if (s.status === 'out_for_delivery') note = "It's out for delivery and should arrive today.";
    else if (s.status === 'delivered') note = 'It has been delivered. If you can\'t find it, let me know and I\'ll connect you with the team.';

    return this.reply(
      [...lines, note].filter(Boolean).join('\n'),
      [
        { label: 'Open live tracking', value: `link:/tracking?id=${encodeURIComponent(s.trackingId)}` },
        s.status === 'on_hold' || s.status === 'delivered' ? ACT.person : { label: 'Track another', value: 'track_package' },
      ],
      'awaiting_choice',
      0,
    );
  }
}
