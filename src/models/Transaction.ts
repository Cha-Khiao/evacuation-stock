import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  itemId: mongoose.Types.ObjectId;
  type: 'IN' | 'OUT';
  quantity: number;
  destinationShelterId?: mongoose.Types.ObjectId;
  actionBy: string;
  note?: string;
}

const TransactionSchema: Schema = new Schema({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
  type: { type: String, enum: ['IN', 'OUT'], required: true }, // IN = รับเข้า, OUT = จ่ายออก
  quantity: { type: Number, required: true },
  destinationShelterId: { type: Schema.Types.ObjectId, ref: 'Shelter' }, // หากจ่ายออก ต้องระบุศูนย์ที่รับ
  actionBy: { type: String, required: true }, // ชื่อเจ้าหน้าที่ผู้บันทึก
  note: { type: String }
}, { timestamps: true });

export default mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);