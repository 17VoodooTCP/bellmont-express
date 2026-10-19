import {
  Body,
  Controller,
  Get,
  Ip,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminGuard, AuthGuard } from './auth.guard';
import type { AuthedRequest } from './auth.guard';
import { assertHuman } from '../common/turnstile';

/* Behind Render's proxy the socket address is the proxy's. A client can send
   its own X-Forwarded-For, and the proxy appends to it, so only the last
   entry (the address the proxy saw) can be trusted for rate limiting. */
const clientIp = (req: AuthedRequest, fallback: string) =>
  String(req.headers['x-forwarded-for'] ?? '')
    .split(',')
    .pop()
    ?.trim() || fallback;

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  /* Both sign-in forms (customer and admin) post here; the captcha runs
     before the password is even looked at, so a bot without a token costs
     one cheap 400 and never touches the database. */
  @Post('login')
  async login(
    @Req() req: AuthedRequest,
    @Ip() ip: string,
    @Body() body: { email: string; password: string; turnstileToken?: string },
  ) {
    const from = clientIp(req, ip);
    await assertHuman(body?.turnstileToken, from, 'login');
    return this.auth.login(body?.email ?? '', body?.password ?? '', from);
  }

  @Post('register')
  async register(
    @Req() req: AuthedRequest,
    @Ip() ip: string,
    @Body() body: Record<string, unknown>,
  ) {
    const from = clientIp(req, ip);
    await assertHuman(body?.turnstileToken, from, 'register');
    return this.auth.register(body, from);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: AuthedRequest) {
    return this.auth.me(req.user.id);
  }

  @Put('me')
  @UseGuards(AuthGuard)
  updateProfile(
    @Req() req: AuthedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    return this.auth.updateProfile(req.user.id, body);
  }

  @Post('password')
  @UseGuards(AuthGuard)
  changePassword(
    @Req() req: AuthedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    return this.auth.changePassword(req.user.id, body);
  }

  @Get('customers')
  @UseGuards(AdminGuard)
  customers(@Query('search') search?: string) {
    return this.auth.customers(search);
  }
}
