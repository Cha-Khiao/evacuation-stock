import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import Item from '@/models/Item';
import User from '@/models/User';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    // 🟢 ถ้ายังไม่ได้ส่งอีเมลมา (เพิ่งโหลดหน้าเว็บ) ให้ตีกลับเป็นค่าว่าง ป้องกันการดึงข้อมูลผิด
    if (!email) return NextResponse.json({ success: true, data: [] });

    const user = await User.findOne({ email });
    if (!user) return NextResponse.json({ success: true, data: [] });

    let query: any = {};

    if (user.role === 'ADMIN') {
      // 🔴 ADMIN: หาของส่วนกลางทั้งหมดก่อน
      const centralItems = await Item.find({ 
        $or: [{ shelterId: null }, { shelterId: { $exists: false } }] 
      }).select('_id');
      const centralItemIds = centralItems.map(i => i._id);
      
      // ดึงประวัติ "เฉพาะ" ของที่อยู่ในคลังส่วนกลางเท่านั้น
      query = { itemId: { $in: centralItemIds } };
    } 
    else if (user.role === 'STAFF') {
      // 🔴 STAFF: หาของในศูนย์ตัวเองทั้งหมดก่อน
      const staffItems = await Item.find({ shelterId: user.shelterId }).select('_id');
      const staffItemIds = staffItems.map(i => i._id);
      
      // ดึงประวัติ "เฉพาะ" ของที่อยู่ในคลังศูนย์ตัวเองเท่านั้น
      query = { itemId: { $in: staffItemIds } };
    }

    // สั่งฐานข้อมูลให้ดึงตามเงื่อนไขที่ล็อกไว้ 100%
    const transactions = await Transaction.find(query)
      .populate('itemId destinationShelterId')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: transactions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const payload = await req.json();
    const itemsToProcess = Array.isArray(payload) ? payload : [payload];

    if (itemsToProcess.length === 0) return NextResponse.json({ success: false, error: 'ไม่มีข้อมูลคำสั่งเบิก' }, { status: 400 });

    const email = itemsToProcess[0].email;
    let sourceShelterId = null; // เริ่มที่คลังส่วนกลาง

    if (email) {
      const user = await User.findOne({ email });
      if (user && user.role === 'STAFF') sourceShelterId = user.shelterId; // เปลี่ยนเป็นคลังศูนย์
    }

    let successCount = 0; const errors = [];

    for (const itemReq of itemsToProcess) {
      // ค้นหาของให้ตรงกับคลังของคนทำรายการ
      const queryItem = sourceShelterId 
        ? { name: itemReq.itemName, shelterId: sourceShelterId } 
        : { name: itemReq.itemName, $or: [{ shelterId: null }, { shelterId: { $exists: false } }] };

      const dbItem = await Item.findOne(queryItem);
      
      if (!dbItem || dbItem.stockQuantity < itemReq.quantity) {
        errors.push(`[${itemReq.itemName}] สต็อกไม่พอ`); continue;
      }

      dbItem.stockQuantity -= itemReq.quantity;
      await dbItem.save();

      await Transaction.create({
        itemId: dbItem._id, type: 'OUT', quantity: itemReq.quantity,
        destinationShelterId: itemReq.destinationShelterId || null,
        actionBy: itemReq.actionBy || 'เจ้าหน้าที่', note: itemReq.note || 'เบิกจ่ายหน้างาน'
      });
      successCount++;
    }

    if (successCount === 0) return NextResponse.json({ success: false, error: `ไม่สามารถเบิกได้: ${errors.join(', ')}` }, { status: 400 });
    return NextResponse.json({ success: true, message: `ทำการเบิกจ่ายสำเร็จ ${successCount} รายการ`, errors: errors.length > 0 ? errors : undefined });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}