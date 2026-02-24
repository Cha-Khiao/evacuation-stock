'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="landing-wrapper d-flex flex-column align-items-center justify-content-center h-100 w-100 position-absolute top-0 start-0 overflow-hidden" style={{ zIndex: 9999 }}>
      
      <div className="glow-shape shape-primary"></div>
      <div className="glow-shape shape-info"></div>

      <div className="container z-1 text-center px-4">
        <div className="row justify-content-center">
          <div className="col-lg-8 col-xl-7">
            
            <div className="mb-5">
              <div className="hero-icon mb-4">📦</div>
              <h1 className="display-4 fw-bold mb-3 text-body-emphasis tracking-tight">
                Evacuation <span className="text-primary">Stock</span>
              </h1>
              <p className="lead text-muted mb-5 fw-normal px-md-4">
                ระบบจัดการและบริหารคลังสิ่งของบรรเทาทุกข์ เพื่อการกระจายความช่วยเหลืออย่างรวดเร็ว แม่นยำ และสามารถตรวจสอบประวัติได้แบบเรียลไทม์
              </p>
            </div>

            <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
              {session ? (
                <Link href="/dashboard" className="btn btn-primary btn-lg px-5 py-3 rounded-pill fw-bold shadow-lg btn-hover-lift">
                  เข้าสู่แผงควบคุม (Dashboard) <span className="ms-2">🚀</span>
                </Link>
              ) : (
                <Link href="/login" className="btn btn-primary btn-lg px-5 py-3 rounded-pill fw-bold shadow-lg btn-hover-lift">
                  เข้าสู่ระบบ (Login) <span className="ms-2">🔐</span>
                </Link>
              )}
            </div>

          </div>
        </div>
      </div>

      <div className="position-absolute bottom-0 mb-4 text-muted small z-1">
        &copy; {new Date().getFullYear()} Evacuation Center Management System.
      </div>

      <style jsx>{`
        .landing-wrapper {
          background-color: var(--bs-body-bg);
        }
        .hero-icon {
          font-size: 5rem;
          filter: drop-shadow(0 15px 25px rgba(0,0,0,0.1));
          animation: float-icon 4s ease-in-out infinite alternate;
        }
        .tracking-tight {
          letter-spacing: -1.5px;
        }
        .glow-shape {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.3;
          z-index: 0;
          animation: pulse-glow 8s infinite alternate;
        }
        .shape-primary {
          width: 50vw;
          height: 50vw;
          background: var(--bs-primary);
          top: -20vh;
          left: -10vw;
        }
        .shape-info {
          width: 40vw;
          height: 40vw;
          background: var(--bs-info);
          bottom: -15vh;
          right: -10vw;
          animation-delay: -4s;
        }
        .btn-hover-lift {
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .btn-hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(13, 110, 253, 0.3) !important;
        }

        /* รองรับ Dark Mode ให้แสงดูนุ่มลง */
        [data-bs-theme="dark"] .glow-shape {
          opacity: 0.15; 
        }

        @keyframes float-icon {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-15px); }
        }
        @keyframes pulse-glow {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}