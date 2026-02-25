import mongoose, { Schema, Document } from 'mongoose';

export interface IRequest extends Document {
  shelterId: mongoose.Types.ObjectId;
  items: Array<{ itemId: mongoose.Types.ObjectId; itemName: string; quantity: number }>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: string;
  actionBy?: string; // ชื่อ Admin ที่กดอนุมัติ/ปฏิเสธ
  note?: string;
  rejectReason?: string;
}

const RequestSchema: Schema = new Schema({
  shelterId: { type: Schema.Types.ObjectId, ref: 'Shelter', required: true },
  items: [{
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true }
  }],
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  requestedBy: { type: String, required: true },
  actionBy: { type: String },
  note: { type: String },
  rejectReason: { type: String }
}, { timestamps: true });

export default mongoose.models.Request || mongoose.model<IRequest>('Request', RequestSchema);