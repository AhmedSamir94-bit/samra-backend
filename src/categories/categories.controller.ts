import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import {
  categoryListResponseExample,
  categoryResponseExample,
  createCategoryRequestExample,
  updateCategoryRequestExample,
} from '../swagger/examples/category.examples';

@ApiTags('Categories')
@ApiBearerAuth('access-token')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories' })
  @ApiOkResponse({ schema: { example: categoryListResponseExample } })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a category' })
  @ApiBody({
    type: CreateCategoryDto,
    examples: { default: { value: createCategoryRequestExample } },
  })
  @ApiOkResponse({ schema: { example: categoryResponseExample } })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', example: '67abc123def4567890123456' })
  @ApiBody({
    type: UpdateCategoryDto,
    examples: { default: { value: updateCategoryRequestExample } },
  })
  @ApiOkResponse({ schema: { example: categoryResponseExample } })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', example: '67abc123def4567890123456' })
  @ApiNoContentResponse()
  async remove(@Param('id') id: string) {
    await this.categoriesService.remove(id);
  }
}
