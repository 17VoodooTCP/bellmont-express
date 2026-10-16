import {
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
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  /* ── The signed-in customer's own feed ── */

  @Get()
  @UseGuards(AuthGuard)
  mine(@Req() req: AuthedRequest, @Query('limit') limit = '30') {
    return this.notifications.list(req.user.id, Number(limit) || 30);
  }

  @Post('read-all')
  @UseGuards(AuthGuard)
  readAllMine(@Req() req: AuthedRequest) {
    return this.notifications.markAllRead(req.user.id);
  }

  /* ── The admin team's feed. Declared before ':id' routes. ── */

  @Get('admin')
  @UseGuards(AdminGuard)
  admin(@Query('limit') limit = '30') {
    return this.notifications.list(null, Number(limit) || 30);
  }

  @Post('admin/read-all')
  @UseGuards(AdminGuard)
  readAllAdmin() {
    return this.notifications.markAllRead(null);
  }

  @Post('admin/:id/read')
  @UseGuards(AdminGuard)
  readAdmin(@Param('id') id: string) {
    return this.notifications.markRead(id, null);
  }

  @Post(':id/read')
  @UseGuards(AuthGuard)
  readMine(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.notifications.markRead(id, req.user.id);
  }
}
