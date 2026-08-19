import {
  Controller,
  Get,
} from '@nestjs/common';

import { PrismaService } from './database/prisma.service';
import { ResponseMessage } from './common/decorators/response-message.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  @Get('health/db')
  @ResponseMessage('Database connected successfully')
  async checkDatabase() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      database: 'connected',
    };
  }
}