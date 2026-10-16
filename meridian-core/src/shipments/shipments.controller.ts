import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { AdminGuard, AuthGuard } from '../auth/auth.guard';
import type { AuthedRequest } from '../auth/auth.guard';

@Controller('shipments')
export class ShipmentsController {
  constructor(private shipments: ShipmentsService) {}

  @Get('track/:trackingId')
  track(@Param('trackingId') trackingId: string) {
    return this.shipments.track(trackingId);
  }

  /** The signed-in customer's own shipments. Declared before any ':id' route. */
  @Get('mine')
  @UseGuards(AuthGuard)
  mine(@Req() req: AuthedRequest) {
    return this.shipments.listMine(req.user.id);
  }

  @Get()
  @UseGuards(AdminGuard)
  list(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.shipments.list(status, Number(page), Number(limit));
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() body: Record<string, unknown>) {
    return this.shipments.create(body);
  }

  @Put(':id/status')
  @UseGuards(AdminGuard)
  setStatus(
    @Param('id') id: string,
    @Body() body: { status: string; location?: string; description?: string },
  ) {
    return this.shipments.setStatus(id, body);
  }

  @Put(':id/hold')
  @UseGuards(AdminGuard)
  hold(@Param('id') id: string, @Body() body: { holdReason?: string }) {
    return this.shipments.hold(id, body.holdReason);
  }

  @Put(':id/owner')
  @UseGuards(AdminGuard)
  setOwner(@Param('id') id: string, @Body() body: { email?: string | null; userId?: string | null }) {
    return this.shipments.setOwner(id, body);
  }

  @Put(':id/resume')
  @UseGuards(AdminGuard)
  resume(@Param('id') id: string) {
    return this.shipments.resume(id);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.shipments.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.shipments.remove(id);
  }
}
