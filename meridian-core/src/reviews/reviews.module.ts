import { Module } from '@nestjs/common';
import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGuard } from '../auth/auth.guard';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  list(includeUnpublished = false) {
    return this.prisma.review
      .findMany({
        where: includeUnpublished ? {} : { published: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      })
      .then((reviews) => ({ reviews }));
  }

  create(data: { name: string; role: string; stars: number; avatar?: string; quote: string }) {
    return this.prisma.review
      .create({
        data: {
          name: data.name,
          role: data.role,
          stars: Math.min(5, Math.max(1, Number(data.stars) || 5)),
          avatar: data.avatar ?? '',
          quote: data.quote,
        },
      })
      .then((review) => ({ review }));
  }

  async update(id: string, data: Partial<{ name: string; role: string; stars: number; avatar: string; quote: string; published: boolean; sortOrder: number }>) {
    if (data.stars != null) data.stars = Math.min(5, Math.max(1, Number(data.stars)));
    const review = await this.prisma.review
      .update({ where: { id }, data })
      .catch(() => null);
    if (!review) throw new NotFoundException('Review not found');
    return { review };
  }

  async remove(id: string) {
    await this.prisma.review.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Review not found');
    });
    return { deleted: true };
  }
}

@Controller('reviews')
export class ReviewsController {
  constructor(private reviews: ReviewsService) {}

  @Get()
  list() {
    return this.reviews.list();
  }

  @Get('all')
  @UseGuards(AdminGuard)
  listAll() {
    return this.reviews.list(true);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() body: { name: string; role: string; stars: number; avatar?: string; quote: string }) {
    return this.reviews.create(body);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() body: Record<string, never>) {
    return this.reviews.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.reviews.remove(id);
  }
}

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService, PrismaService],
})
export class ReviewsModule {}
