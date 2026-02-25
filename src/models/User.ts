import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string; // ใช้เป็น Username ตอนล็อกอิน
  password?: string;
  role: 'ADMIN' | 'STAFF'; // แยกสิทธิ์ ศูนย์ใหญ่ vs ศูนย์ย่อย
  shelterId?: mongoose.Types.ObjectId; // ถ้าเป็น STAFF ต้องระบุว่าอยู่ศูนย์อพยพไหน
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'STAFF'], default: 'STAFF' },
  shelterId: { type: Schema.Types.ObjectId, ref: 'Shelter', default: null } 
}, { timestamps: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);