import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/auth.guard';
import type { AuthedRequest } from '../auth/auth.guard';
import { LettersService } from './letters.service';

@Controller('letters')
export class LettersController {
  constructor(private letters: LettersService) {}

  @Get('drafts')
  @UseGuards(AdminGuard)
  listDrafts() {
    return this.letters.listDrafts();
  }

  @Post('drafts')
  @UseGuards(AdminGuard)
  saveDraft(@Body() body: Record<string, unknown>, @Req() req: AuthedRequest) {
    return this.letters.saveDraft(body, req.user.id);
  }

  @Delete('drafts/:id')
  @UseGuards(AdminGuard)
  deleteDraft(@Param('id') id: string) {
    return this.letters.deleteDraft(id);
  }

  @Get('executives')
  @UseGuards(AdminGuard)
  listExecutives() {
    return this.letters.listExecutives();
  }

  @Post('executives')
  @UseGuards(AdminGuard)
  addExecutive(@Body() body: { name?: string; title?: string; department?: string }) {
    return this.letters.addExecutive(body);
  }

  @Post('issue')
  @UseGuards(AdminGuard)
  issue(@Body() body: Record<string, string>, @Req() req: AuthedRequest) {
    return this.letters.issue({ ...body, issuedBy: req.user.id });
  }

  @Get('verify/:reference')
  verify(@Param('reference') reference: string) {
    return this.letters.verify(reference);
  }
}
