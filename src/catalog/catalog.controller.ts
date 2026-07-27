import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CategoriesService } from '../categories/categories.service';
import { ProductsService } from '../products/products.service';

function toPublicProduct(product: {
  _id: { toString(): string };
  name: string;
  price: number;
  stock: number;
  unitType: string;
  barcode?: string;
  category?: string;
}) {
  return {
    id: product._id.toString(),
    name: product.name,
    price: product.price,
    stock: product.stock,
    unitType: product.unitType,
    barcode: product.barcode,
    category: product.category,
  };
}

@ApiTags('Catalog')
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly categoriesService: CategoriesService,
  ) {}

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Public category list' })
  async categories() {
    const items = await this.categoriesService.findAll();
    return items.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      description: c.description,
      color: c.color,
    }));
  }

  @Public()
  @Get('products')
  @ApiOperation({ summary: 'Public product list' })
  async products(@Query('search') search?: string) {
    const items = await this.productsService.findAll(search);
    return items.map((p) => toPublicProduct(p));
  }

  @Public()
  @Get('products/:id')
  @ApiOperation({ summary: 'Public product detail' })
  async product(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    return toPublicProduct(product);
  }
}
