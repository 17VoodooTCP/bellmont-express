import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type DraftInput = {
  id?: string;
  recipientName?: string;
  recipientAddress?: string;
  subject?: string;
  body?: string;
  signerName?: string;
  signerTitle?: string;
  department?: string;
  classification?: string;
  reference?: string;
};

@Injectable()
export class LettersService {
  constructor(private prisma: PrismaService) {}

  listDrafts() {
    return this.prisma.letterDraft.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100,
    }).then((drafts) => ({ drafts }));
  }

  async saveDraft(input: DraftInput, savedBy?: string) {
    const data = {
      title: String(input.subject ?? input.recipientName ?? '').trim() || 'Untitled letter',
      recipientName: String(input.recipientName ?? ''),
      recipientAddress: String(input.recipientAddress ?? ''),
      subject: String(input.subject ?? ''),
      body: String(input.body ?? ''),
      signerName: String(input.signerName ?? ''),
      signerTitle: String(input.signerTitle ?? ''),
      department: String(input.department ?? 'Operations'),
      classification: String(input.classification ?? 'Private & Confidential'),
      reference: String(input.reference ?? ''),
      savedBy: savedBy ?? null,
    };
    const draft = input.id
      ? await this.prisma.letterDraft.update({ where: { id: input.id }, data })
      : await this.prisma.letterDraft.create({ data });
    return { draft };
  }

  async deleteDraft(id: string) {
    await this.prisma.letterDraft.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Draft not found');
    });
    return { deleted: true };
  }

  listExecutives() {
    return this.prisma.executive.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }],
    }).then((executives) => ({ executives }));
  }

  async addExecutive(input: { name?: string; title?: string; department?: string }) {
    const executive = await this.prisma.executive.create({
      data: {
        name: String(input.name ?? '').trim(),
        title: String(input.title ?? '').trim(),
        department: String(input.department ?? 'Operations').trim(),
      },
    });
    return { executive };
  }

  issue(input: {
    fingerprint?: string;
    reference?: string;
    verificationId?: string;
    recipientName?: string;
    subject?: string;
    department?: string;
    classification?: string;
    signerName?: string;
    signerTitle?: string;
    authorizationId?: string;
    issuedOn?: string;
    issuedBy?: string;
  }) {
    return this.prisma.issuedLetter.upsert({
      where: { reference: String(input.reference ?? '') },
      create: {
        reference: String(input.reference ?? ''),
        verificationId: String(input.verificationId ?? ''),
        recipientName: String(input.recipientName ?? ''),
        subject: String(input.subject ?? ''),
        department: String(input.department ?? 'Operations'),
        classification: String(input.classification ?? 'Private & Confidential'),
        signerName: String(input.signerName ?? ''),
        signerTitle: String(input.signerTitle ?? ''),
        authorizationId: String(input.authorizationId ?? ''),
        issuedOn: String(input.issuedOn ?? ''),
        fingerprint: String(input.fingerprint ?? ''),
        issuedBy: input.issuedBy ?? null,
      },
      update: {
        verificationId: String(input.verificationId ?? ''),
        fingerprint: String(input.fingerprint ?? ''),
        issuedBy: input.issuedBy ?? null,
      },
    }).then((letter) => ({ letter }));
  }
}
