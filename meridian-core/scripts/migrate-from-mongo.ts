/* One-time migration: Meridian Mongo cluster → PostgreSQL via Prisma.
   Usage: MONGO_URI=... DATABASE_URL=... npx ts-node scripts/migrate-from-mongo.ts */
import { MongoClient } from 'mongodb';
import { PrismaClient, Prisma } from '@prisma/client';

const MONGO_URI = process.env.MONGO_URI ?? '';

async function main() {
  if (!MONGO_URI) throw new Error('Set MONGO_URI');
  const prisma = new PrismaClient();
  const mongo = await new MongoClient(MONGO_URI).connect();
  const db = mongo.db();

  const users = await db.collection('users').find().toArray();
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: String(u.email).toLowerCase() },
      update: {},
      create: {
        name: u.name ?? 'User',
        email: String(u.email).toLowerCase(),
        password: u.password, // bcrypt hashes carry over unchanged
        role: u.role === 'admin' ? 'admin' : 'user',
        createdAt: u.createdAt ?? new Date(),
      },
    });
  }
  console.log(`users: ${users.length}`);

  const shipments = await db.collection('shipments').find().toArray();
  for (const s of shipments) {
    await prisma.shipment.upsert({
      where: { trackingId: s.trackingId },
      update: {},
      create: {
        trackingId: s.trackingId,
        senderName: s.senderName ?? '',
        senderAddress: s.senderAddress ?? null,
        receiverName: s.receiverName ?? '',
        receiverAddress: s.receiverAddress ?? null,
        weight: s.weight ?? null,
        packageType: s.packageType ?? null,
        status: s.status ?? 'pending',
        origin: (s.origin ?? {}) as Prisma.InputJsonValue,
        destination: (s.destination ?? {}) as Prisma.InputJsonValue,
        currentLocation: (s.currentLocation ?? {}) as Prisma.InputJsonValue,
        timeline: (s.timeline ?? []) as Prisma.InputJsonValue,
        invoices: (s.invoices ?? []) as Prisma.InputJsonValue,
        estimatedDelivery: s.estimatedDelivery ?? null,
        holdReason: s.holdReason ?? null,
        delayReason: s.delayReason ?? null,
        delayDescription: s.delayDescription ?? null,
        customsIntercepted: !!s.customsIntercepted,
        borderClearanceEligible: !!s.borderClearanceEligible,
        customsNotes: s.customsNotes ?? null,
        createdAt: s.createdAt ?? new Date(),
      },
    });
  }
  console.log(`shipments: ${shipments.length}`);

  const sessions = await db.collection('chatsessions').find().toArray();
  for (const c of sessions) {
    await prisma.chatSession.upsert({
      where: { sessionId: c.sessionId },
      update: {},
      create: {
        sessionId: c.sessionId,
        userName: c.userName ?? 'Website Visitor',
        status: ['bot', 'human', 'closed'].includes(c.status) ? c.status : 'closed',
        context: (c.context ?? { state: 'greeting' }) as Prisma.InputJsonValue,
        createdAt: c.createdAt ?? new Date(),
      },
    });
  }
  console.log(`chat sessions: ${sessions.length}`);

  const messages = await db.collection('messages').find().toArray();
  let copied = 0;
  for (const m of messages) {
    const parent = await prisma.chatSession.findUnique({
      where: { sessionId: m.sessionId },
    });
    if (!parent) continue;
    await prisma.message.create({
      data: {
        sessionId: m.sessionId,
        sender: m.sender ?? 'user',
        message: m.message ?? '',
        quickActions: (m.quickActions ?? []) as Prisma.InputJsonValue,
        timestamp: m.timestamp ?? new Date(),
      },
    });
    copied++;
  }
  console.log(`messages: ${copied}`);

  await mongo.close();
  await prisma.$disconnect();
  console.log('migration complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
