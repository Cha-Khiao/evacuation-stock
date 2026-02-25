'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  Chart as ChartJS, ArcElement, Tooltip, Legend, 
  CategoryScale, LinearScale, BarElement, Title 
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import toast from 'react-hot-toast';

// ลงทะเบียนใช้งาน Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function DashboardPage() {
  const { data: session } = useSession();
  
  // 🟢 ตรวจสอบว่าเป็น Admin หรือ Staff
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [loading, setLoading] = useState(true);
  
  // States เก็บข้อมูลสรุป
  const [items, setItems] = useState<any[]>([]);
  const [shelters, setShelters] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  const fetchData = async () => {
    // 🟢 ถ้ายังไม่มี session ให้ข้ามไปก่อน
    if (!session?.user?.email) return;

    try {
      // 🟢 แนบ email ไปกับ URL เพื่อให้ API ดึงข้อมูลตรงกับคลังของตัวเอง
      const emailQuery = `?email=${encodeURIComponent(session.user.email)}`;
      
      const reqs = [
        fetch(`/api/items${emailQuery}`),
        fetch(`/api/transactions${emailQuery}`)
      ];
      
      // Admin เท่านั้นที่ต้องดึงข้อมูลศูนย์อพยพทั้งหมดมานับจำนวน
      if (isAdmin) {
        reqs.push(fetch('/api/shelters'));
      }

      const responses = await Promise.all(reqs);
      const itemsData = await responses[0].json();
      const txData = await responses[1].json();

      if (itemsData.success) setItems(itemsData.data);
      if (txData.success) setTransactions(txData.data);

      if (isAdmin && responses[2]) {
        const sheltersData = await responses[2].json();
        if (sheltersData.success) setShelters(sheltersData.data);
      }
    } catch (error) {
      toast.error('ไม่สามารถโหลดข้อมูล Dashboard ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [session, isAdmin]);

  // --- คำนวณข้อมูลสำหรับแสดงผล ---
  const totalStock = items.reduce((acc, item) => acc + item.stockQuantity, 0);
  const lowStockItems = items.filter(item => item.stockQuantity < 50 && item.stockQuantity > 0);
  const outOfStockItems = items.filter(item => item.stockQuantity === 0);
  
  const recentTransactions = transactions.slice(0, 5); // เอาแค่ 5 รายการล่าสุด

  // --- ข้อมูลสำหรับกราฟโดนัท (สัดส่วนหมวดหมู่สิ่งของ) ---
  const categories = ['อาหาร', 'น้ำดื่ม', 'ยารักษาโรค', 'เครื่องนุ่งห่ม', 'อุปกรณ์ยังชีพ'];
  const categoryData = categories.map(cat => 
    items.filter(item => item.category === cat).reduce((acc, item) => acc + item.stockQuantity, 0)
  );

  const doughnutChartData = {
    labels: categories,
    datasets: [{
      data: categoryData,
      backgroundColor: ['#ffc107', '#0dcaf0', '#dc3545', '#6610f2', '#198754'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  // --- ข้อมูลสำหรับกราฟแท่ง (ประวัติเข้า-ออก ย้อนหลัง) ---
  const inTotal = transactions.filter(tx => tx.type === 'IN').reduce((acc, tx) => acc + tx.quantity, 0);
  const outTotal = transactions.filter(tx => tx.type === 'OUT').reduce((acc, tx) => acc + tx.quantity, 0);

  const barChartData = {
    labels: ['ปริมาณรับเข้า (IN)', 'ปริมาณเบิกจ่าย (OUT)'],
    datasets: [{
      label: 'จำนวนรวมทั้งหมด (ชิ้น)',
      data: [inTotal, outTotal],
      backgroundColor: ['#198754', '#dc3545'],
      borderRadius: 4
    }]
  };

  const chartOptions = {
    plugins: { legend: { labels: { color: '#6c757d' } } },
    maintainAspectRatio: false
  };

  if (loading) return <div className="text-center py-5 text-muted mt-5"><span className="spinner-border spinner-border-sm me-2"></span>กำลังประมวลผลข้อมูล...</div>;

  return (
    <div className="row mt-3">
      {/* 🟢 การ์ดสรุปผลตัวเลข (Summary Cards) */}
      
      {/* 🟢 ถ้าเป็น Admin ให้โชว์กล่อง "ศูนย์อพยพทั้งหมด" */}
      {isAdmin && (
        <div className="col-md-3 mb-4">
          <div className="card shadow-sm border-0 bg-primary text-white h-100">
            <div className="card-body">
              <h6 className="card-title text-white-50 fw-bold">🏠 ศูนย์อพยพทั้งหมด</h6>
              <h2 className="mb-0 fw-bold display-5">{shelters.length}</h2>
              <div className="mt-2 small text-white-50">ศูนย์</div>
            </div>
          </div>
        </div>
      )}
      
      {/* 🟢 ปรับขนาด Grid ให้ขยายพอดีจอ ถ้า Staff ไม่มีกล่องศูนย์อพยพ */}
      <div className={`col-md-${isAdmin ? '3' : '4'} mb-4`}>
        <div className="card shadow-sm border-0 bg-success text-white h-100">
          <div className="card-body">
            <h6 className="card-title text-white-50 fw-bold">📦 สิ่งของในคลังรวม</h6>
            <h2 className="mb-0 fw-bold display-5">{totalStock.toLocaleString()}</h2>
            <div className="mt-2 small text-white-50">ชิ้น</div>
          </div>
        </div>
      </div>

      <div className={`col-md-${isAdmin ? '3' : '4'} mb-4`}>
        <div className="card shadow-sm border-0 bg-warning text-dark h-100">
          <div className="card-body">
            <h6 className="card-title text-dark-50 fw-bold opacity-75">⚠️ ของใกล้หมด (&lt;50 ชิ้น)</h6>
            <h2 className="mb-0 fw-bold display-5">{lowStockItems.length}</h2>
            <div className="mt-2 small opacity-75">รายการที่ต้องเตรียมสั่งเพิ่ม</div>
          </div>
        </div>
      </div>

      <div className={`col-md-${isAdmin ? '3' : '4'} mb-4`}>
        <div className="card shadow-sm border-0 bg-danger text-white h-100">
          <div className="card-body">
            <h6 className="card-title text-white-50 fw-bold">❌ ของหมดสต็อก (0 ชิ้น)</h6>
            <h2 className="mb-0 fw-bold display-5">{outOfStockItems.length}</h2>
            <div className="mt-2 small text-white-50">รายการที่ไม่สามารถเบิกได้</div>
          </div>
        </div>
      </div>

      {/* 🟢 กราฟและสถิติ */}
      <div className="col-lg-5 mb-4">
        <div className="card shadow-sm border-0 h-100 bg-body-tertiary">
          <div className="card-header bg-body border-bottom py-3">
            <h6 className="mb-0 fw-bold text-primary">📊 สัดส่วนสิ่งของแยกตามหมวดหมู่</h6>
          </div>
          <div className="card-body d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
            {totalStock > 0 ? (
              <div style={{ height: '250px', width: '100%' }}>
                <Doughnut data={doughnutChartData} options={chartOptions} />
              </div>
            ) : <p className="text-muted">ยังไม่มีข้อมูลสิ่งของในคลัง</p>}
          </div>
        </div>
      </div>

      <div className="col-lg-7 mb-4">
        <div className="card shadow-sm border-0 h-100 bg-body-tertiary">
          <div className="card-header bg-body border-bottom py-3">
            <h6 className="mb-0 fw-bold text-primary">📈 สถิติการรับเข้า - เบิกจ่าย</h6>
          </div>
          <div className="card-body" style={{ minHeight: '300px' }}>
            {transactions.length > 0 ? (
               <div style={{ height: '280px', width: '100%' }}>
                 <Bar data={barChartData} options={{ ...chartOptions, scales: { y: { beginAtZero: true, ticks: { color: '#6c757d' } }, x: { ticks: { color: '#6c757d' } } } }} />
               </div>
            ) : <p className="text-muted text-center mt-5">ยังไม่มีประวัติการทำรายการในคลังนี้</p>}
          </div>
        </div>
      </div>

      {/* 🟢 ตารางแจ้งเตือนของใกล้หมด & ประวัติล่าสุด */}
      <div className="col-lg-5 mb-4">
        <div className="card shadow-sm border-0 h-100">
          <div className="card-header bg-warning py-3">
            <h6 className="mb-0 fw-bold text-dark opacity-75">⚠️ รายการของใกล้หมด (ต่ำกว่า 50 ชิ้น)</h6>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '14px' }}>
                <thead className="table-light"><tr><th className="ps-3 border-bottom py-2">สิ่งของ</th><th className="border-bottom py-2">หมวดหมู่</th><th className="text-end pe-3 border-bottom py-2">คงเหลือ</th></tr></thead>
                <tbody>
                  {lowStockItems.length > 0 ? (
                    lowStockItems.map(item => (
                      <tr key={item._id}>
                        <td className="ps-3 fw-medium">{item.name}</td>
                        <td><span className="badge bg-secondary rounded-pill fw-normal">{item.category}</span></td>
                        <td className="text-end fw-bold text-danger pe-3">{item.stockQuantity}</td>
                      </tr>
                    ))
                  ) : <tr><td colSpan={3} className="text-center py-4 text-muted">สต็อกปลอดภัยทุกรายการ</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-7 mb-4">
        <div className="card shadow-sm border-0 h-100">
          <div className="card-header bg-body py-3 d-flex justify-content-between align-items-center border-bottom">
            <h6 className="mb-0 fw-bold text-primary">⏱️ ความเคลื่อนไหวล่าสุด</h6>
            <Link href="/history" className="btn btn-sm btn-outline-primary shadow-sm" style={{ fontSize: '12px' }}>ดูประวัติทั้งหมด</Link>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '14px' }}>
                <thead className="table-light"><tr><th className="ps-3 border-bottom py-2">ประเภท</th><th className="border-bottom py-2">รายการ</th><th className="border-bottom py-2 text-end pe-4">จำนวน</th><th className="border-bottom py-2">ผู้ทำรายการ</th></tr></thead>
                <tbody>
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map(tx => (
                      <tr key={tx._id}>
                        <td className="ps-3">
                          {tx.type === 'OUT' ? <span className="badge bg-danger fw-normal">📤 เบิกจ่าย</span> : <span className="badge bg-success fw-normal">📥 รับเข้า</span>}
                        </td>
                        <td className="fw-medium text-truncate" style={{ maxWidth: '150px' }}>{tx.itemId?.name || '-'}</td>
                        <td className={`text-end fw-bold pe-4 ${tx.type === 'OUT' ? 'text-danger' : 'text-success'}`}>
                          {tx.type === 'OUT' ? '-' : '+'}{tx.quantity.toLocaleString()}
                        </td>
                        <td className="text-muted small">👤 {tx.actionBy}</td>
                      </tr>
                    ))
                  ) : <tr><td colSpan={4} className="text-center py-4 text-muted">ยังไม่มีความเคลื่อนไหว</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}