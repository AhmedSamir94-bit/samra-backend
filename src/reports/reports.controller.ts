import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import {
  profitsReportResponseExample,
  salesReportResponseExample,
  topSellingReportResponseExample,
} from '../swagger/examples/report.examples';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':type')
  @ApiOperation({
    summary: 'Get report by type',
    description:
      'Types: sales, purchases, profits, top-selling, purchased-items, sold-items',
  })
  @ApiParam({
    name: 'type',
    example: 'sales',
    enum: [
      'sales',
      'purchases',
      'profits',
      'top-selling',
      'purchased-items',
      'sold-items',
    ],
  })
  @ApiQuery({ name: 'from', required: false, example: '2026-07-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-07-25' })
  @ApiOkResponse({
    description: 'Report payload varies by type',
    schema: {
      oneOf: [
        { example: salesReportResponseExample },
        { example: profitsReportResponseExample },
        { example: topSellingReportResponseExample },
      ],
    },
  })
  getReport(
    @Param('type') type: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getReport(type, from, to);
  }
}
