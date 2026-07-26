import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { applyIdTransform } from '../../common/utils/schema.util';
import { UserRole } from '../user-role';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  username!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.ADMIN,
  })
  role!: UserRole;

  @Prop()
  refreshTokenHash?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
applyIdTransform(UserSchema);
