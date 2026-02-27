import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import RequestModel from '@/models/Request';
import Item from '@/models/Item';
import User from '@/models/User';
import Transaction from '@/models/Transaction';

export async function GET() {
  try {
    await connectToDatabase();
    const requests = await RequestModel.find({}).populate('shelterId', 'name district').sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: requests });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { email, items, note, requestedBy } = await req.json();

    const user = await User.findOne({ email });
    if (!user || !user.shelterId) return NextResponse.json({ success: false, error: 'บัญชีไม่ได้ผูกกับศูนย์อพยพ' }, { status: 403 });

    // หักของจากคลัง "ส่วนกลาง" ทันทีเพื่อจองไว้
    for (const cartItem of items) {
      const dbItem = await Item.findOne({ _id: cartItem.itemId, shelterId: null });
      if (!dbItem || dbItem.stockQuantity < cartItem.quantity) {
        return NextResponse.json({ success: false, error: `สต็อกส่วนกลาง "${cartItem.itemName}" ไม่เพียงพอ` }, { status: 400 });
      }
      dbItem.stockQuantity -= cartItem.quantity;
      await dbItem.save();
    }

    const newRequest = await RequestModel.create({ shelterId: user.shelterId, items, requestedBy, note });
    return NextResponse.json({ success: true, message: 'ส่งคำขอเบิกสำเร็จ', data: newRequest }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 🟢 ระบบอนุมัติและ โอนของข้ามคลัง (Transfer)
export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const { requestId, status, actionBy, rejectReason } = await req.json();

    const requestDoc = await RequestModel.findById(requestId);
    if (!requestDoc) return NextResponse.json({ success: false, error: 'ไม่พบใบคำขอเบิกนี้' }, { status: 404 });
    if (requestDoc.status !== 'PENDING') return NextResponse.json({ success: false, error: 'คำขอนี้ถูกจัดการไปแล้ว' }, { status: 400 });

    requestDoc.status = status;
    requestDoc.actionBy = actionBy;
    if (rejectReason) requestDoc.rejectReason = rejectReason;

    if (status === 'REJECTED') {
      // ❌ ถ้าปฏิเสธ: คืนของกลับ "คลังส่วนกลาง"
      for (const reqItem of requestDoc.items) {
        await Item.findOneAndUpdate({ _id: reqItem.itemId, shelterId: null }, { $inc: { stockQuantity: reqItem.quantity } });
      }
    } 
    else if (status === 'APPROVED') {
      // ✅ ถ้าอนุมัติ: โอนของไปเข้า "คลังศูนย์อพยพ"
      for (const reqItem of requestDoc.items) {
        
        // 1. บันทึกประวัติ "จ่ายออก" ของส่วนกลาง
        await Transaction.create({
          itemId: reqItem.itemId, type: 'OUT', quantity: reqItem.quantity,
          destinationShelterId: requestDoc.shelterId, actionBy: actionBy, note: `โอนของตามใบเบิก (${requestDoc._id})`
        });

        // 2. เอาของไป "เพิ่ม" ในคลังของศูนย์อพยพ
        let staffItem = await Item.findOne({ name: reqItem.itemName, shelterId: requestDoc.shelterId });
        
        if (staffItem) {
          staffItem.stockQuantity += reqItem.quantity;
          await staffItem.save();
        } else {
          // ถ้าศูนย์นี้ไม่เคยมีของชิ้นนี้ ให้สร้างใหม่ในคลังของศูนย์
          const centralItem = await Item.findById(reqItem.itemId);
          staffItem = await Item.create({
            name: reqItem.itemName,
            category: centralItem?.category || 'ไม่ระบุ',
            stockQuantity: reqItem.quantity,
            shelterId: requestDoc.shelterId
          });
        }

        // 3. บันทึกประวัติ "รับเข้า" ของศูนย์อพยพ
        await Transaction.create({
          itemId: staffItem._id, type: 'IN', quantity: reqItem.quantity,
          destinationShelterId: requestDoc.shelterId, actionBy: 'ระบบโอนอัตโนมัติ', note: `ได้รับอนุมัติจากส่วนกลาง`
        });
      }
    }

    await requestDoc.save();
    return NextResponse.json({ success: true, message: `ทำการ ${status === 'APPROVED' ? 'อนุมัติและโอนสต็อก' : 'ปฏิเสธ'} สำเร็จ!` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}