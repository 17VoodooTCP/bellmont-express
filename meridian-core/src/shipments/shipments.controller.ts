import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { AdminGuard } from '../auth/auth.guard';

@Controller('shipments')
export class ShipmentsController {
  constructor(private shipments: ShipmentsService) {}

  @Get('track/:trackingId')
  track(@Param('trackingId') trackingId: string) {
    return this.shipments.track(trackingId);
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
