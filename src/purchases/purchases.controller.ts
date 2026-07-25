import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreatePurchaseDto, UpdatePurchaseDto } from './dto/purchase.dto';
import { PurchasesService } from './purchases.service';
import {
  createPurchaseRequestExample,
  nextPurchaseNumberResponseExample,
  purchaseListResponseExample,
  purchaseResponseExample,
  updatePurchaseRequestExample,
} from '../swagger/examples/purchase.examples';

@ApiTags('Purchases')
@ApiBearerAuth('access-token')
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  @ApiOperation({ summary: 'List purchase invoices' })
  @ApiQuery({ name: 'from', required: false, example: '2026-07-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-07-25' })
  @ApiOkResponse({ schema: { example: purchaseListResponseExample } })
  findAll(@Query('from') from?: string, @Query('to') to?: string) {
    return this.purchasesService.findAll(from, to);
  }

  @Get('next-number')
  @ApiOperation({ summary: 'Get next purchase invoice number' })
  @ApiOkResponse({ schema: { example: nextPurchaseNumberResponseExample } })
  getNextNumber() {
    return this.purchasesService.getNextInvoiceNumber();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase invoice by id' })
  @ApiParam({ name: 'id', example: '67abc123def4567890123888' })
  @ApiOkResponse({ schema: { example: purchaseResponseExample } })
  findOne(@Param('id') id: string) {
    return this.purchasesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a purchase invoice' })
  @ApiBody({
    type: CreatePurchaseDto,
    examples: { default: { value: createPurchaseRequestExample } },
  })
  @ApiOkResponse({ schema: { example: purchaseResponseExample } })
  create(@Body() dto: CreatePurchaseDto) {
    return this.purchasesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a purchase invoice' })
  @ApiParam({ name: 'id', example: '67abc123def4567890123888' })
  @ApiBody({
    type: UpdatePurchaseDto,
    examples: { default: { value: updatePurchaseRequestExample } },
  })
  @ApiOkResponse({ schema: { example: purchaseResponseExample } })
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseDto) {
    return this.purchasesService.update(id, dto);
  }
}
