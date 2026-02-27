'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  
  // 🟢 State สำหรับเก็บชื่อศูนย์อพยพของ Staff
  const [shelterName, setShelterName] = useState('');

  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  useEffect(() => { setMounted(true); }, []);

  // 🟢 ดึงข้อมูลชื่อศูนย์อพยพเฉพาะกรณีที่เป็น Staff
  useEffect(() => {
    if (session?.user?.email && !isAdmin) {
      fetch('/api/users')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            // หาข้อมูล User ตัวเองจากอีเมล
            const me = data.data.find((u: any) => u.email === session?.user?.email);
            if (me && me.shelterId) {
              setShelterName(me.shelterId.name);
            }
          }
        })
        .catch(() => {}); // ซ่อน Error ไว้ถ้าดึงไม่สำเร็จ
    }
  }, [session, isAdmin]);

  if (pathname === '/login' || pathname === '/') return null;

  const getPageTitle = () => {
    if (pathname.startsWith('/dashboard')) return '🏠 แผงควบคุม (Dashboard)';
    if (pathname.startsWith('/shelters')) return '🏕️ จัดการศูนย์อพยพ';
    if (pathname.startsWith('/items')) return '📥 รับเข้าสิ่งของ (เพิ่มสต็อก)';
    if (pathname.startsWith('/transactions')) return '📤 เบิกจ่ายสิ่งของ (ลดสต็อก)';
    if (pathname.startsWith('/requests')) return '🛎️ ระบบขอเบิก / อนุมัติรายการ';
    if (pathname.startsWith('/history')) return '🗂️ ประวัติการทำรายการทั้งหมด';
    if (pathname.startsWith('/users')) return '👥 จัดการบัญชีผู้ใช้งาน';
    return '📦 ระบบจัดการสต็อกอพยพ';
  };

  return (
    <header 
      className="d-flex justify-content-between align-items-center p-3 mx-3 mt-3 glass-header border" 
      style={{ position: 'sticky', top: '1rem', zIndex: 1000 }}
    >
      <div><h5 className="mb-0 fw-bold text-primary ps-2">{getPageTitle()}</h5></div>
      
      <div className="d-flex align-items-center gap-3 pe-2">
        {mounted && (
          <button 
            className="btn btn-body border shadow-sm rounded-circle d-flex align-items-center justify-content-center" 
            style={{ width: '40px', height: '40px' }}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
            title="สลับโหมดหน้าจอ"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        )}
        
        {session && (
          <div className="dropdown">
            <button className="btn btn-primary dropdown-toggle fw-medium shadow-sm rounded-pill px-3" type="button" data-bs-toggle="dropdown">
              👤 {session.user?.name} 
              {/* 🟢 แสดงชื่อศูนย์ต่อท้ายชื่อ ถ้าเป็น Staff */}
              {shelterName && <span className="fw-normal ms-1 opacity-75 small">({shelterName})</span>}
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-2 rounded-4 p-2">
              <li>
                <div className="px-3 py-2">
                  <span className="d-block text-body-emphasis fw-bold">{session.user?.name}</span>
                  <span className="d-block text-muted small" style={{ fontSize: '12px' }}>{session.user?.email}</span>
                </div>
              </li>
              <li><hr className="dropdown-divider opacity-25" /></li>
              <li>
                <div className="px-3 py-1 mb-2">
                  {/* 🟢 ปรับเปลี่ยนป้ายบอกสถานะในเมนูย่อย */}
                  <span className={`badge ${isAdmin ? 'bg-primary' : 'bg-info text-dark'} w-100 rounded-pill py-2`}>
                    {isAdmin ? 'ผู้อำนวยการ (Admin)' : `ประจำศูนย์: ${shelterName || 'กำลังโหลด...'}`}
                  </span>
                </div>
              </li>
              <li>
                <button className="dropdown-item text-danger fw-bold rounded-3" onClick={() => signOut({ callbackUrl: '/' })}>
                  🚪 ออกจากระบบ
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}