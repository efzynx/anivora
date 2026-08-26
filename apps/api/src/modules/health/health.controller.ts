import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    database: 'up' | 'down';
  };
}

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthCheckResponse> {
    let dbStatus: 'up' | 'down' = 'down';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
    } catch {
      dbStatus = 'down';
    }

    return {
      status: dbStatus === 'up' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbStatus,
      },
    };
  }
}
