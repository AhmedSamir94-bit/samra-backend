import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateSaleDto } from './dto/sale.dto';
import { SalesService } from './sales.service';
import {
  createSaleRequestExample,
  saleListResponseExample,
  saleResponseExample,
} from '../swagger/examples/sale.examples';

@ApiTags('Sales')
@ApiBearerAuth('access-token')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'List sales invoices' })
  @ApiQuery({ name: 'from', required: false, example: '2026-07-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-07-25' })
  @ApiOkResponse({ schema: { example: saleListResponseExample } })
  findAll(@Query('from') from?: string, @Query('to') to?: string) {
    return this.salesService.findAll(from, to);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sale invoice by id' })
  @ApiParam({ name: 'id', example: '67abc123def4567890123999' })
  @ApiOkResponse({ schema: { example: saleResponseExample } })
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a sale invoice' })
  @ApiBody({
    type: CreateSaleDto,
    examples: { default: { value: createSaleRequestExample } },
  })
  @ApiOkResponse({ schema: { example: saleResponseExample } })
  create(@Body() dto: CreateSaleDto) {
    return this.salesService.create(dto);
  }
}
