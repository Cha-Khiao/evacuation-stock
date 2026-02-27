import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string; 
  password?: string;
  role: 'ADMIN' | 'STAFF'; 
  shelterId?: mongoose.Types.ObjectId; 
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'STAFF'], default: 'STAFF' },
  shelterId: { type: Schema.Types.ObjectId, ref: 'Shelter', default: null } 
}, { timestamps: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);