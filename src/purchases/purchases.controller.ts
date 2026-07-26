import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user-role';
import { CreatePurchaseDto, UpdatePurchaseDto } from './dto/purchase.dto';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
@Roles(UserRole.SUPER_ADMIN)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  findAll(@Query('from') from?: string, @Query('to') to?: string) {
    return this.purchasesService.findAll(from, to);
  }

  @Get('next-number')
  getNextNumber() {
    return this.purchasesService.getNextInvoiceNumber();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchasesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePurchaseDto) {
    return this.purchasesService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseDto) {
    return this.purchasesService.update(id, dto);
  }
}
