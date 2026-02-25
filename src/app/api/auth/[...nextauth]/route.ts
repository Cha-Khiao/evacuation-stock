import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('กรุณากรอกอีเมลและรหัสผ่าน');
        }

        await connectToDatabase();
        
        // ค้นหาผู้ใช้จากอีเมล
        const user = await User.findOne({ email: credentials.email }).populate('shelterId', 'name district');
        
        if (!user) {
          throw new Error('ไม่พบอีเมลนี้ในระบบ');
        }

        // ตรวจสอบรหัสผ่าน
        const isPasswordMatch = await bcrypt.compare(credentials.password, user.password);
        
        if (!isPasswordMatch) {
          throw new Error('รหัสผ่านไม่ถูกต้อง');
        }

        // ส่งข้อมูลผู้ใช้กลับไปเก็บใน Session
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          shelterId: user.shelterId ? user.shelterId._id.toString() : null,
          shelterName: user.shelterId ? user.shelterId.name : null
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // ยัดข้อมูล Role และ Shelter ลงใน Token
        token.role = (user as any).role;
        token.shelterId = (user as any).shelterId;
        token.shelterName = (user as any).shelterName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // ส่งข้อมูลจาก Token ไปให้หน้าเว็บใช้งานผ่าน Session
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).shelterId = token.shelterId;
        (session.user as any).shelterName = token.shelterName;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // ล็อกอินอยู่ได้ 1 วัน
  },
  pages: {
    signIn: '/login', // ตั้งค่าว่าถ้ายังไม่ล็อกอิน ให้เด้งไปหน้า /login
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_key_for_dev",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };