import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGuard } from '../auth/auth.guard';

type ReviewBody = {
  name?: string;
  role?: string;
  stars?: number;
  avatar?: string;
  quote?: string;
  published?: boolean;
  sortOrder?: number;
};

const clampStars = (n: unknown) =>
  Math.min(5, Math.max(1, Math.round(Number(n) || 5)));

@Controller('reviews')
export class ReviewsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.review.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  @Get('all')
  @UseGuards(AdminGuard)
  listAll() {
    return this.prisma.review.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() body: ReviewBody) {
    return this.prisma.review.create({
      data: {
        name: body.name ?? 'New Customer',
        role: body.role ?? '',
        stars: clampStars(body.stars),
        avatar: body.avatar ?? '',
        quote: body.quote ?? '',
        published: body.published ?? true,
        sortOrder: body.sortOrder ?? 0,
      },
    });
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() body: ReviewBody) {
    return this.prisma.review.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.role !== undefined && { role: body.role }),
        ...(body.stars !== undefined && { stars: clampStars(body.stars) }),
        ...(body.avatar !== undefined && { avatar: body.avatar }),
        ...(body.quote !== undefined && { quote: body.quote }),
        ...(body.published !== undefined && { published: body.published }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string) {
    await this.prisma.review.delete({ where: { id } });
    return { success: true };
  }
}
