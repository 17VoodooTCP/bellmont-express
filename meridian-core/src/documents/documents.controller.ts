import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard, AuthGuard } from '../auth/auth.guard';
import type { AuthedRequest } from '../auth/auth.guard';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private documents: DocumentsService) {}

  @Get('mine')
  @UseGuards(AuthGuard)
  mine(@Req() req: AuthedRequest) {
    return this.documents.listMine(req.user.id);
  }

  @Post()
  @UseGuards(AdminGuard)
  send(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
    return this.documents.send(req.user, body);
  }

  @Get()
  @UseGuards(AdminGuard)
  list(@Query('shipmentId') shipmentId?: string) {
    return this.documents.list(shipmentId);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.documents.remove(id);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  get(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.documents.get(id, req.user);
  }
}
