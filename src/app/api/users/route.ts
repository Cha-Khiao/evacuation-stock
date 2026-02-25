import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

// ดึงรายชื่อผู้ใช้งานทั้งหมด
export async function GET() {
  try {
    await connectToDatabase();
    // ดึงข้อมูล User แต่ไม่เอา Password มาแสดงเพื่อความปลอดภัย
    const users = await User.find({}).select('-password').populate('shelterId', 'name district').sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// สร้างบัญชีผู้ใช้งานใหม่
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { name, email, password, role, shelterId } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    // เช็คว่าอีเมลนี้มีคนใช้ไปหรือยัง
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'อีเมลนี้มีในระบบแล้ว กรุณาใช้อีเมลอื่น' }, { status: 400 });
    }

    // เข้ารหัส Password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'STAFF',
      shelterId: (role === 'STAFF' && shelterId) ? shelterId : null // ถ้าเป็น Admin ไม่ต้องผูกศูนย์อพยพ
    });

    return NextResponse.json({ success: true, message: 'สร้างบัญชีผู้ใช้งานสำเร็จ!' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ลบบัญชีผู้ใช้งาน
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: 'ไม่พบ ID ของผู้ใช้งาน' }, { status: 400 });

    await connectToDatabase();
    await User.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'ลบบัญชีสำเร็จ' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}