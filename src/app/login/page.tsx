'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');

    setLoading(true);
    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      toast.error(result.error);
      setLoading(false);
    } else {
      toast.success('เข้าสู่ระบบสำเร็จ!');
      
      router.push('/dashboard'); 
      router.refresh(); 
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center h-100 w-100 bg-body-tertiary position-absolute top-0 start-0 z-3">
      <div className="col-11 col-sm-8 col-md-6 col-lg-4 col-xl-3">
        <div className="card shadow-lg border-0 rounded-4 p-2">
          <div className="card-body p-4 p-sm-5">
            <div className="text-center mb-4">
              <div className="display-4 mb-3">📦</div>
              <h3 className="fw-bold text-primary mb-1">เข้าสู่ระบบ</h3>
              <p className="text-muted small">ระบบจัดการสต็อก ศูนย์อพยพ</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-medium small">อีเมล (Email)</label>
                <input 
                  type="email" 
                  className="form-control form-control-lg bg-body-tertiary border-0" 
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="form-label fw-medium small">รหัสผ่าน (Password)</label>
                <input 
                  type="password" 
                  className="form-control form-control-lg bg-body-tertiary border-0" 
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-100 fw-bold rounded-pill shadow-sm" disabled={loading}>
                {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>
            
            <div className="mt-4 text-center">
              <Link href="/" className="text-decoration-none text-muted small hover-primary">
                &larr; กลับหน้าหลัก
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}