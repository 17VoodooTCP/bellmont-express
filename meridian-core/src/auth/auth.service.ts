import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OnApplicationBootstrap } from '@nestjs/common';
import { RateLimiter } from '../common/rate-limit';
import { EMAIL_RE, password as passwordRule, str } from '../common/validate';

type SafeUser = Omit<User, 'password'>;

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  /* Ten sign-in attempts per address per 15 minutes, and thirty per network
     address, so neither one account nor the service can be brute-forced.
     Registration is capped per network address to stop mass sign-ups. */
  private loginByEmail = new RateLimiter(10, 15 * 60 * 1000);
  private loginByIp = new RateLimiter(30, 15 * 60 * 1000);
  private registerByIp = new RateLimiter(10, 60 * 60 * 1000);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async onApplicationBootstrap() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email && !password) return;
    if (!email || !password) {
      throw new Error(
        'ADMIN_EMAIL and ADMIN_PASSWORD must be configured together',
      );
    }
    if (password.length < 16) {
      throw new Error('ADMIN_PASSWORD must be at least 16 characters long');
    }

    const name = process.env.ADMIN_NAME?.trim() || 'Bellmont Administrator';
    const hashedPassword = await bcrypt.hash(password, 12);

    await this.prisma.user.upsert({
      where: { email },
      create: { name, email, password: hashedPassword, role: 'admin' },
      update: { name, password: hashedPassword, role: 'admin' },
    });

    this.logger.log(`Admin account provisioned for ${email}`);
  }

  private toSafe(user: SafeUser) {
    // legacy client expects `_id`
    return { _id: user.id, ...user };
  }

  private strip(user: User): SafeUser {
    const safe: Partial<User> = { ...user };
    delete safe.password;
    return safe as SafeUser;
  }

  private sign(user: { id: string; role: string }) {
    return this.jwt.sign({ id: user.id, role: user.role });
  }

  async login(email: string, password: string, ip: string) {
    const normalized = email.toLowerCase().trim();
    this.loginByIp.check(ip);
    this.loginByEmail.check(normalized);

    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    this.loginByEmail.reset(normalized);
    return { user: this.toSafe(this.strip(user)), token: this.sign(user) };
  }

  async register(body: Record<string, unknown>, ip: string) {
    const name = str(body, 'name', 'Full name', {
      required: true,
      min: 2,
      max: 80,
    })!;
    const email = (
      str(body, 'email', 'Email', { required: true, max: 254 }) ?? ''
    ).toLowerCase();
    if (!EMAIL_RE.test(email))
      throw new BadRequestException('Enter a valid email address.');
    const pw = passwordRule(body);
    const phone = str(body, 'phone', 'Phone', { max: 40 });
    const company = str(body, 'company', 'Company', { max: 120 });

    /* Counted only once the form is valid: a person correcting a typo in the
       password rules must not lock themselves — or their whole office behind
       one network address — out for an hour. */
    this.registerByIp.check(ip);

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists)
      throw new ConflictException(
        'An account with this email already exists. Sign in instead.',
      );

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        phone,
        company,
        password: await bcrypt.hash(pw, 12),
      },
    });
    return { user: this.toSafe(this.strip(user)), token: this.sign(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return { user: this.toSafe(this.strip(user)) };
  }

  async updateProfile(userId: string, body: Record<string, unknown>) {
    const data: {
      name?: string;
      phone?: string | null;
      company?: string | null;
    } = {};
    if ('name' in (body ?? {}))
      data.name = str(body, 'name', 'Full name', {
        required: true,
        min: 2,
        max: 80,
      })!;
    if ('phone' in (body ?? {}))
      data.phone = str(body, 'phone', 'Phone', { max: 40 });
    if ('company' in (body ?? {}))
      data.company = str(body, 'company', 'Company', { max: 120 });
    const user = await this.prisma.user.update({ where: { id: userId }, data });
    return { user: this.toSafe(this.strip(user)) };
  }

  async changePassword(userId: string, body: Record<string, unknown>) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const current =
      typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    if (!(await bcrypt.compare(current, user.password))) {
      throw new BadRequestException('Your current password is incorrect.');
    }
    const next = passwordRule(body, 'newPassword', 'New password');
    if (await bcrypt.compare(next, user.password)) {
      throw new BadRequestException(
        'Choose a password different from your current one.',
      );
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: await bcrypt.hash(next, 12) },
    });
    return { ok: true };
  }

  /** Admin: customer directory with activity counts. */
  async customers(search?: string) {
    const q = search?.trim();
    const users = await this.prisma.user.findMany({
      where: {
        role: 'user',
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { company: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        createdAt: true,
        _count: {
          select: { shipments: true, requests: true, documents: true },
        },
      },
    });
    return { customers: users };
  }
}
