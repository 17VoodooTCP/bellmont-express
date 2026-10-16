import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard, AuthGuard } from '../auth/auth.guard';
import type { AuthedRequest } from '../auth/auth.guard';
import { RequestsService } from './requests.service';

@Controller('requests')
export class RequestsController {
  constructor(private requests: RequestsService) {}

  /* ── Customer ── */

  @Post()
  @UseGuards(AuthGuard)
  create(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
    return this.requests.create(req.user.id, body);
  }

  @Get('mine')
  @UseGuards(AuthGuard)
  mine(@Req() req: AuthedRequest) {
    return this.requests.listMine(req.user.id);
  }

  @Post(':id/cancel')
  @UseGuards(AuthGuard)
  cancel(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.requests.cancel(req.user.id, id);
  }

  /* ── Admin ── */

  @Get()
  @UseGuards(AdminGuard)
  list(@Query('status') status?: string) {
    return this.requests.list(status);
  }

  @Post(':id/approve')
  @UseGuards(AdminGuard)
  approve(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.requests.approve(id, req.user, body);
  }

  @Post(':id/reject')
  @UseGuards(AdminGuard)
  reject(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.requests.reject(id, req.user, body);
  }

  /* ── Either: a customer sees only their own ── */

  @Get(':id')
  @UseGuards(AuthGuard)
  get(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.requests.get(id, req.user);
  }
}
