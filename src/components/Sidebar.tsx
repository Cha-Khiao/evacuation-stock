'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // ซ่อน Sidebar ในหน้า Login และ Landing Page
  if (pathname === '/login' || pathname === '/') return null;

  return (
    // 🟢 หุ้มด้วย Padding เพื่อให้ Sidebar ดูลอยออกมาจากขอบจอ
    <div className="p-3 sidebar-wrapper" style={{ width: '290px', height: '100vh', position: 'sticky', top: 0 }}>
      
      {/* 🟢 ตัวกล่อง Sidebar ที่ใส่สไตล์ Glassmorphism */}
      <div className="d-flex flex-column h-100 p-3 sidebar-glass border">
        
        {/* ชื่อแบรนด์ ล้อตามหน้า Landing Page */}
        <Link href="/dashboard" className="d-flex align-items-center mb-4 mt-2 text-decoration-none px-2">
          <span className="fs-4 fw-bold text-body-emphasis" style={{ letterSpacing: '-0.5px' }}>
            📦 Evac<span className="text-primary">Stock</span>
          </span>
        </Link>
        
        <hr className="mt-0 text-secondary opacity-25" />

        {status === 'loading' ? (
          <div className="text-center text-muted small mt-4">กำลังโหลด...</div>
        ) : session ? (
          <ul className="nav flex-column mb-auto mt-2">
            <li className="nav-item">
              <Link href="/dashboard" className={`nav-link nav-link-custom ${pathname === '/dashboard' ? 'active' : ''}`}>
                🏠 แผงควบคุม (Dashboard)
              </Link>
            </li>
            
            {(session.user as any)?.role === 'ADMIN' && (
              <>
                <li>
                  <Link href="/shelters" className={`nav-link nav-link-custom ${pathname.startsWith('/shelters') ? 'active' : ''}`}>
                    🏕️ จัดการศูนย์อพยพ
                  </Link>
                </li>
                <li>
                  <Link href="/users" className={`nav-link nav-link-custom ${pathname.startsWith('/users') ? 'active' : ''}`}>
                    👥 จัดการบัญชีผู้ใช้งาน
                  </Link>
                </li>
              </>
            )}
            
            <li>
              <Link href="/items" className={`nav-link nav-link-custom ${pathname.startsWith('/items') ? 'active' : ''}`}>
                📥 รับเข้าสิ่งของ (IN)
              </Link>
            </li>
            
            <li>
              <Link href="/transactions" className={`nav-link nav-link-custom ${pathname.startsWith('/transactions') ? 'active' : ''}`}>
                📤 เบิกจ่ายสิ่งของ (OUT)
              </Link>
            </li>

            <li>
              <Link href="/requests" className={`nav-link nav-link-custom ${pathname.startsWith('/requests') ? 'active' : ''}`}>
                🛎️ ระบบขอเบิก / อนุมัติ
              </Link>
            </li>

            <li>
              <Link href="/history" className={`nav-link nav-link-custom ${pathname.startsWith('/history') ? 'active' : ''}`}>
                🗂️ ประวัติการทำรายการ
              </Link>
            </li>
          </ul>
        ) : (
          <div className="text-center mt-5 mb-auto">
            <p className="text-muted small mb-3">กรุณาเข้าสู่ระบบ</p>
          </div>
        )}
        
        {/* เครดิตด้านล่างสุด */}
        <div className="mt-auto pt-3 border-top border-secondary border-opacity-25 text-center">
          <small className="text-muted fw-medium" style={{ fontSize: '11px' }}>
            &copy; 2026 Evacuation Center.
          </small>
        </div>

      </div>
    </div>
  );
}