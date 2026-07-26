import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { UserRole } from './user-role';
import { User } from './schemas/user.schema';

export type PublicUser = {
  id: string;
  username: string;
  name: string;
  role: UserRole;
};

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async onModuleInit() {
    await this.ensureRolesForExistingUsers();
  }

  toPublicUser(user: User & { _id: { toString(): string } }): PublicUser {
    return {
      id: user._id.toString(),
      username: user.username,
      name: user.name,
      role: user.role || UserRole.SUPER_ADMIN,
    };
  }

  findByUsername(username: string) {
    return this.userModel.findOne({ username: username.toLowerCase() }).exec();
  }

  findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  findAll() {
    return this.userModel.find().sort({ createdAt: -1 }).exec();
  }

  async create(data: {
    username: string;
    password: string;
    name: string;
    role?: UserRole;
  }) {
    const existing = await this.findByUsername(data.username);
    if (existing) {
      throw new ConflictException('اسم المستخدم مستخدم بالفعل');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.userModel.create({
      username: data.username.toLowerCase(),
      password: hashedPassword,
      name: data.name.trim(),
      role: data.role || UserRole.ADMIN,
    });
  }

  async update(
    id: string,
    data: {
      username?: string;
      password?: string;
      name?: string;
      role?: UserRole;
    },
  ) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    if (data.username && data.username.toLowerCase() !== user.username) {
      const existing = await this.findByUsername(data.username);
      if (existing) {
        throw new ConflictException('اسم المستخدم مستخدم بالفعل');
      }
      user.username = data.username.toLowerCase();
    }

    if (data.name !== undefined) {
      user.name = data.name.trim();
    }

    if (data.role !== undefined) {
      user.role = data.role;
    }

    if (data.password) {
      user.password = await bcrypt.hash(data.password, 10);
    }

    await user.save();
    return user;
  }

  async remove(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    await this.userModel.findByIdAndDelete(id).exec();
    return user;
  }

  updateRefreshTokenHash(userId: string, refreshTokenHash?: string) {
    return this.userModel
      .findByIdAndUpdate(userId, { refreshTokenHash }, { new: true })
      .exec();
  }

  countUsers() {
    return this.userModel.countDocuments().exec();
  }

  async ensureRolesForExistingUsers() {
    await this.userModel
      .updateMany(
        { $or: [{ role: { $exists: false } }, { role: null }] },
        { $set: { role: UserRole.SUPER_ADMIN } },
      )
      .exec();

    // Ensure the default bootstrap account stays super admin.
    await this.userModel
      .updateOne(
        { username: 'admin' },
        { $set: { role: UserRole.SUPER_ADMIN } },
      )
      .exec();
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
