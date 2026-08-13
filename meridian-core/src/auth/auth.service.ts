import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

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
