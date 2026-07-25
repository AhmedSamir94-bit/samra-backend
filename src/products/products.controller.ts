import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductsService } from './products.service';
import {
  createProductRequestExample,
  productListResponseExample,
  productResponseExample,
  updateProductRequestExample,
} from '../swagger/examples/product.examples';

@ApiTags('Products')
@ApiBearerAuth('access-token')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products (optional search)' })
  @ApiQuery({ name: 'search', required: false, example: 'كولا' })
  @ApiOkResponse({ schema: { example: productListResponseExample } })
  findAll(@Query('search') search?: string) {
    return this.productsService.findAll(search);
  }

  @Get('barcode/:code')
  @ApiOperation({ summary: 'Find product by barcode' })
  @ApiParam({ name: 'code', example: '6223000000001' })
  @ApiOkResponse({ schema: { example: productResponseExample } })
  findByBarcode(@Param('code') code: string) {
    return this.productsService.findByBarcode(code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by id' })
  @ApiParam({ name: 'id', example: '67abc123def4567890123456' })
  @ApiOkResponse({ schema: { example: productResponseExample } })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a product' })
  @ApiBody({
    type: CreateProductDto,
    examples: { default: { value: createProductRequestExample } },
  })
  @ApiOkResponse({ schema: { example: productResponseExample } })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', example: '67abc123def4567890123456' })
  @ApiBody({
    type: UpdateProductDto,
    examples: { default: { value: updateProductRequestExample } },
  })
  @ApiOkResponse({ schema: { example: productResponseExample } })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', example: '67abc123def4567890123456' })
  @ApiNoContentResponse()
  async remove(@Param('id') id: string) {
    await this.productsService.remove(id);
  }
}
