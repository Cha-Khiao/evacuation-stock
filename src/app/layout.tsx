import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import { Kanit } from 'next/font/google';
import { Providers } from './providers';
import { Toaster } from 'react-hot-toast';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

const kanit = Kanit({ subsets: ['thai', 'latin'], weight: ['300', '400', '500', '600', '700'], display: 'swap' });

export const metadata = { title: 'Evacuation Stock System', description: 'ระบบจัดการสต็อก ศูนย์อพยพ' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={kanit.className}>
        <Providers>
          <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: 'var(--bs-body-bg)' }}>
            
            <Sidebar />

            <div className="flex-grow-1 d-flex flex-column" style={{ minWidth: 0 }}>

              <Header />
              
              <main className="p-3 p-md-4 flex-grow-1">
                <div className="container-fluid mx-auto">
                  {children}
                </div>
              </main>

            </div>
          </div>
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}