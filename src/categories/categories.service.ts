import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { Category } from './schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  async findAll() {
    return this.categoryModel.find().sort({ name: 1 }).exec();
  }

  async create(dto: CreateCategoryDto) {
    return this.categoryModel.create({
      name: dto.name.trim(),
      description: dto.description?.trim(),
      color: dto.color || '#3B82F6',
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryModel
      .findByIdAndUpdate(
        id,
        {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.description !== undefined && {
            description: dto.description?.trim(),
          }),
          ...(dto.color !== undefined && { color: dto.color }),
        },
        { new: true, runValidators: true },
      )
      .exec();

    if (!category) {
      throw new NotFoundException('الفئة غير موجودة');
    }

    return category;
  }

  async remove(id: string) {
    const category = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!category) {
      throw new NotFoundException('الفئة غير موجودة');
    }
  }
}
