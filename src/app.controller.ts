import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator';
import { healthOkExample } from './swagger/examples/health.examples';

@ApiTags('Health')
@Controller()
export class AppController {
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({
    description: 'Service is healthy',
    schema: { example: healthOkExample },
  })
  health() {
    const mongoConfigured = Boolean(process.env.MONGODB_URI?.trim());
    return {
      status: 'ok',
      version: 'boot-2026-07-26a',
      mongoConfigured,
      mode: mongoConfigured ? 'full' : 'degraded',
      hint: mongoConfigured
        ? undefined
        : 'Set MONGODB_URI in Vercel Environment Variables and redeploy',
    };
  }
}
