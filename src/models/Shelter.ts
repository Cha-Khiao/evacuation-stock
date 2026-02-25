import mongoose, { Schema, Document } from 'mongoose';

export interface IShelter extends Document {
  name: string;
  description?: string;
  location?: string;
  capacity?: number;
  capacityStatus: string; 
  shelterType: string; 
  phoneNumbers: string[];
  responsible: any[];
  status: string;
  district: string;
  subdistrict?: string;
}

const ShelterSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  location: { type: String },
  capacity: { type: Number },
  capacityStatus: { type: String, default: 'รองรับได้' }, // 'รองรับได้' หรือ 'ล้นศูนย์'
  shelterType: { type: String, required: true }, // 'ศูนย์พักพิงหลัก' หรือ 'บ้านญาติ'
  phoneNumbers: [{ type: String }],
  responsible: [{
    userId: String,
    firstName: String,
    lastName: String,
    email: String,
    role: String
  }],
  status: { type: String, default: 'active' },
  district: { type: String, required: true }, // เช่น เมือง, โพธิ์ศรีสุวรรณ
  subdistrict: { type: String }
}, { timestamps: true });

export default mongoose.models.Shelter || mongoose.model<IShelter>('Shelter', ShelterSchema);