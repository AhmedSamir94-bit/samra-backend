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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user-role';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { listExpenseTypes } from './expense-type';
import { ExpensesService } from './expenses.service';

@ApiTags('Expenses')
@ApiBearerAuth()
@Controller('expenses')
@Roles(UserRole.SUPER_ADMIN)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('types')
  @ApiOperation({ summary: 'List all expense types with Arabic labels' })
  @ApiOkResponse({ description: 'Expense types' })
  getTypes() {
    return listExpenseTypes();
  }

  @Get('next-number')
  @ApiOperation({ summary: 'Get next expense number' })
  getNextNumber() {
    return this.expensesService.getNextExpenseNumber();
  }

  @Get()
  @ApiOperation({ summary: 'List expenses' })
  findAll(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
  ) {
    return this.expensesService.findAll(from, to, type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expense by id' })
  findOne(@Param('id') id: string) {
    return this.expensesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create expense' })
  create(@Body() dto: CreateExpenseDto, @CurrentUser() user: AuthUser) {
    return this.expensesService.create(dto, user?.name || user?.username);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update expense' })
  update(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.expensesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete expense' })
  async remove(@Param('id') id: string) {
    await this.expensesService.remove(id);
  }
}
