import { Controller, Get, Param, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user-role';
import { ReportsService } from './reports.service';

@Controller('reports')
@Roles(UserRole.SUPER_ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':type')
  getReport(
    @Param('type') type: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getReport(type, from, to);
  }
}
