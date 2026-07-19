import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
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
    return this.userModel
      .findByIdAndUpdate(userId, { refreshTokenHash }, { new: true })
      .exec();
  }

  countUsers() {
    return this.userModel.countDocuments().exec();
  }

  async findUserByRefreshToken(refreshToken: string) {
    const users = await this.userModel
      .find({ refreshTokenHash: { $exists: true, $ne: null } })
      .exec();

    for (const user of users) {
      if (
        user.refreshTokenHash &&
        (await bcrypt.compare(refreshToken, user.refreshTokenHash))
      ) {
        return user;
      }
    }

    return null;
  }
}
