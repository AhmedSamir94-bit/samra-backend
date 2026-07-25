import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  findByUsername(username: string) {
    return this.userModel.findOne({ username: username.toLowerCase() }).exec();
  }

  findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  async create(data: Pick<User, 'username' | 'password' | 'name'>) {
    const existing = await this.findByUsername(data.username);
    if (existing) {
      throw new ConflictException('اسم المستخدم مستخدم بالفعل');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.userModel.create({
      username: data.username.toLowerCase(),
      password: hashedPassword,
      name: data.name.trim(),
    });
  }

  updateRefreshTokenHash(userId: string, refreshTokenHash?: string) {
    if (refreshTokenHash === undefined) {
      return this.userModel
        .findByIdAndUpdate(
          userId,
          { $unset: { refreshTokenHash: 1 } },
          { new: true },
        )
        .exec();
    }

    return this.userModel
      .findByIdAndUpdate(userId, { refreshTokenHash }, { new: true })
      .exec();
  }

  countUsers() {
    return this.userModel.countDocuments().exec();
  }
}
