import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { OnApplicationBootstrap } from '@nestjs/common';

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async onApplicationBootstrap() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email && !password) return;
    if (!email || !password) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be configured together');
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

  private toSafe(user: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    // legacy client expects `_id`
    return { _id: user.id, ...user };
  }

  private sign(user: { id: string; role: string }) {
    return this.jwt.sign({ id: user.id, role: user.role });
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const { password: _omit, ...safe } = user;
    return { user: this.toSafe(safe), token: this.sign(user) };
  }

  async register(name: string, email: string, password: string) {
    const normalized = email.toLowerCase().trim();
    const exists = await this.prisma.user.findUnique({
      where: { email: normalized },
    });
    if (exists) throw new ConflictException('Email already registered');
    const user = await this.prisma.user.create({
      data: {
        name: name.trim(),
        email: normalized,
        password: await bcrypt.hash(password, 12),
      },
    });
    const { password: _omit, ...safe } = user;
    return { user: this.toSafe(safe), token: this.sign(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const { password: _omit, ...safe } = user;
    return { user: this.toSafe(safe) };
  }
}
