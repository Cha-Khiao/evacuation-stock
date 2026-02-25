import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Shelter from '@/models/Shelter';

// GET: ดึงข้อมูลศูนย์อพยพทั้งหมด
export async function GET() {
  try {
    await connectToDatabase();
    const shelters = await Shelter.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: shelters });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch shelters' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    
    if (Array.isArray(body)) {
      const shelters = await Shelter.insertMany(body);
      return NextResponse.json({ success: true, count: shelters.length, data: shelters }, { status: 201 });
    } else {
      const shelter = await Shelter.create(body);
      return NextResponse.json({ success: true, data: shelter }, { status: 201 });
    }
  } catch (error: any) {
    // เพิ่ม console.log เพื่อให้แสดง Error ใน Terminal ของ VS Code / Command Prompt
    console.error("MongoDB Insert Error:", error.message || error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create shelter', 
      details: error.message // ส่งข้อความ Error กลับไปที่ Frontend เผื่อตรวจสอบ
    }, { status: 500 });
  }
}