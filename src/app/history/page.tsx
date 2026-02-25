'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import Pagination from '@/components/Pagination';

export default function HistoryPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; 

  const fetchTransactions = async () => {
    if (!session?.user?.email) return;
    try {
      const res = await fetch(`/api/transactions?email=${encodeURIComponent(session.user.email)}`);
      const data = await res.json();
      if (data.success) { setTransactions(data.data); } else { toast.error('ไม่สามารถโหลดข้อมูลประวัติได้'); }
    } catch (error) { toast.error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchTransactions(); }, [session]);

  const handleExportExcel = () => {
    if (transactions.length === 0) return toast.error('ไม่มีประวัติให้ส่งออก');
    const exportData = transactions.map((tx, index) => ({
      'ลำดับ': index + 1,
      'วัน/เวลา': new Date(tx.createdAt).toLocaleString('th-TH'),
      'ประเภท': tx.type === 'OUT' ? '📤 จ่ายออก' : '📥 รับเข้า',
      'ชื่อสิ่งของ': tx.itemId?.name || 'ไม่ทราบชื่อของ',
      'จำนวน': tx.quantity,
      'ปลายทาง / รายละเอียด': tx.destinationShelterId?.name || tx.note || '-',
      'ผู้ทำรายการ': tx.actionBy
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData); const workbook = XLSX.utils.book_new(); worksheet['!cols'] = [{wch: 6}, {wch: 20}, {wch: 15}, {wch: 25}, {wch: 10}, {wch: 30}, {wch: 25}]; XLSX.utils.book_append_sheet(workbook, worksheet, 'All_Transactions'); XLSX.writeFile(workbook, `ประวัติคลัง_${isAdmin ? 'ส่วนกลาง' : 'ย่อย'}_${new Date().toISOString().split('T')[0]}.xlsx`); toast.success('ดาวน์โหลดประวัติสำเร็จ!');
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchSearch = (tx.itemId?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (tx.actionBy || '').toLowerCase().includes(searchTerm.toLowerCase()) || (tx.destinationShelterId?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (tx.note || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || tx.type === filterType;
    return matchSearch && matchType;
  });

  const indexOfLastItem = currentPage * itemsPerPage; const indexOfFirstItem = indexOfLastItem - itemsPerPage; const currentTransactions = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem); const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterType]);

  return (
    <div className="row mt-3">
      <div className="col-12 mb-4 d-flex justify-content-between align-items-center">
        <h5 className="mb-0 fw-bold text-primary">🗂️ ประวัติคลัง: {isAdmin ? 'ส่วนกลาง' : 'ประจำศูนย์อพยพ'}</h5>
        <button onClick={handleExportExcel} className="btn btn-outline-primary shadow-sm">📤 ส่งออกประวัติ (Excel)</button>
      </div>

      <div className="col-12">
        <div className="card shadow-sm border-0 mb-4 bg-body-tertiary">
          <div className="card-body rounded py-3">
            <div className="row g-3">
              <div className="col-md-8"><input type="text" className="form-control" placeholder="🔍 ค้นหาชื่อสิ่งของ, ศูนย์อพยพ, ผู้เบิก หรือรายละเอียด..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
              <div className="col-md-4"><select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}><option value="all">-- ทุกประเภทรายการ --</option><option value="IN">📥 รับเข้าคลัง (IN)</option><option value="OUT">📤 จ่ายออกจากคลัง (OUT)</option></select></div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm border-0">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '14px' }}>
                <thead className="table-light">
                  <tr>
                    <th className="ps-4 border-bottom py-3">วัน/เวลา</th>
                    <th className="border-bottom py-3">ประเภท</th>
                    <th className="border-bottom py-3">รายการสิ่งของ</th>
                    <th className="text-end border-bottom py-3">จำนวน</th>
                    <th className="border-bottom py-3 ps-4">{isAdmin ? 'ปลายทาง / รายละเอียด' : 'รายละเอียดการแจกจ่าย'}</th>
                    <th className="pe-4 border-bottom py-3">ผู้ทำรายการ</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (<tr><td colSpan={6} className="text-center py-5 text-muted">กำลังโหลดข้อมูล...</td></tr>) : currentTransactions.length > 0 ? (
                    currentTransactions.map((tx) => (
                      <tr key={tx._id}>
                        <td className="ps-4 text-muted small">{new Date(tx.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} น.</td>
                        <td>{tx.type === 'OUT' ? <span className="badge bg-danger px-2 py-1 fw-normal">📤 จ่ายออก</span> : <span className="badge bg-success px-2 py-1 fw-normal">📥 รับเข้า</span>}</td>
                        <td className="fw-medium">{tx.itemId?.name || '-'}</td>
                        <td className={`text-end fw-bold ${tx.type === 'OUT' ? 'text-danger' : 'text-success'}`}>{tx.type === 'OUT' ? '-' : '+'}{tx.quantity.toLocaleString()}</td>
                        <td className="ps-4">
                          {tx.destinationShelterId ? <span className="text-primary fw-medium">{tx.destinationShelterId.name}</span> : <span className="text-muted fst-italic">{tx.note || '-'}</span>}
                        </td>
                        <td className="pe-4"><span className="badge bg-secondary rounded-pill px-3 fw-normal">👤 {tx.actionBy}</span></td>
                      </tr>
                    ))
                  ) : (<tr><td colSpan={6} className="text-center py-5 text-muted">ไม่พบประวัติการทำรายการในคลังของคุณ</td></tr>)}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </div>
      </div>
    </div>
  );
}