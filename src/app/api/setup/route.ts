import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    await connectToDatabase();
    
    // เช็คว่ามีคนในระบบหรือยัง ถ้ามีแล้วจะไม่ยอมให้สร้าง Admin ซ้ำ (ป้องกันคนนอกเข้ามายิง API)
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return NextResponse.json({ success: false, message: 'ระบบได้ตั้งค่าบัญชีแอดมินคนแรกไว้เรียบร้อยแล้ว' });
    }

    // เข้ารหัสผ่าน
    const hashedPassword = await bcrypt.hash('admin1234', 10);

    // สร้าง Admin คนแรก
    const admin = await User.create({
      name: 'ผู้อำนวยการศูนย์ (Admin)',
      email: 'admin@evac.com',
      password: hashedPassword,
      role: 'ADMIN'
    });

    return NextResponse.json({ 
      success: true, 
      message: 'สร้าง Admin คนแรกสำเร็จ!', 
      credentials: {
        email: 'admin@evac.com',
        password: 'admin1234'
      }
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}