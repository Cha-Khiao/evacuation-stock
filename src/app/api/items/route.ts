import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Item from '@/models/Item';
import Transaction from '@/models/Transaction';
import User from '@/models/User';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    
    // 🟢 ป้องกันบั๊ก MongoDB หาค่า null ไม่เจอ ให้ค้นหาตัวที่ไม่มีฟิลด์เลยด้วย
    let query: any = { $or: [{ shelterId: null }, { shelterId: { $exists: false } }] }; 
    
    if (email) {
       const user = await User.findOne({ email });
       if (user && user.role === 'STAFF') {
         // ถ้าเป็น Staff บังคับให้ดูเฉพาะของตัวเองอย่างเดียว
         query = { shelterId: user.shelterId };
       }
    }

    const items = await Item.find(query).sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    
    let targetShelterId = null;
    const email = Array.isArray(body) ? body[0]?.email : body.email; 
    if (email) {
       const user = await User.findOne({ email });
       if (user && user.role === 'STAFF') {
         targetShelterId = user.shelterId; 
       }
    }

    // ฟังก์ชันช่วยหา Item
    const findItem = async (itemName: string) => {
      if (targetShelterId) return await Item.findOne({ name: itemName, shelterId: targetShelterId });
      return await Item.findOne({ name: itemName, $or: [{ shelterId: null }, { shelterId: { $exists: false } }] });
    };

    if (Array.isArray(body)) {
      let count = 0;
      for (const row of body) {
        if (!row.name) continue;
        const qty = Number(row.stockQuantity) || 0;
        
        let item = await findItem(row.name);
        
        if (item) {
          item.stockQuantity += qty;
          await item.save();
        } else {
          item = await Item.create({ name: row.name, category: row.category || 'ระบุภายหลัง', stockQuantity: qty, shelterId: targetShelterId });
        }

        if (qty > 0) {
          await Transaction.create({
            itemId: item._id, type: 'IN', quantity: qty,
            destinationShelterId: targetShelterId, 
            actionBy: row.actionBy || 'นำเข้าจาก Excel', note: 'รับเข้าสต็อก'
          });
          count++;
        }
      }
      return NextResponse.json({ success: true, message: `รับเข้าสำเร็จ ${count} รายการ` }, { status: 201 });
    }

    const { name, category, stockQuantity, actionBy } = body;
    const qty = Number(stockQuantity) || 0;
    
    let item = await findItem(name);
    if (item) {
      item.stockQuantity += qty;
      await item.save();
    } else {
      item = await Item.create({ name, category, stockQuantity: qty, shelterId: targetShelterId });
    }

    if (qty > 0) {
      await Transaction.create({
        itemId: item._id, type: 'IN', quantity: qty,
        destinationShelterId: targetShelterId,
        actionBy: actionBy || 'เจ้าหน้าที่', note: 'รับเข้าสต็อก'
      });
    }

    return NextResponse.json({ success: true, message: 'รับเข้าสต็อกสำเร็จ!' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}