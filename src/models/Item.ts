import mongoose, { Schema, Document } from 'mongoose';

export interface IItem extends Document {
  name: string;
  category: string;
  stockQuantity: number;
  shelterId?: mongoose.Types.ObjectId | null; // 🟢 เพิ่มตัวระบุว่าของชิ้นนี้อยู่คลังไหน
}

const ItemSchema: Schema = new Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  stockQuantity: { type: Number, required: true, default: 0 },
  shelterId: { type: Schema.Types.ObjectId, ref: 'Shelter', default: null } // ถ้าเป็น null = คลังส่วนกลาง
}, { timestamps: true });


if (mongoose.models.Item) {
  delete mongoose.models.Item;
}

export default mongoose.model<IItem>('Item', ItemSchema);