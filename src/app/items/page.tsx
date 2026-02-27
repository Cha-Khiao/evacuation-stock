'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react'; 
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import Pagination from '@/components/Pagination';

export default function ItemsPage() {
  const { data: session } = useSession(); 
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [formData, setFormData] = useState({ name: '', category: 'อาหาร', stockQuantity: '' });

  
  const fetchItems = async () => {
    if (!session?.user?.email) return;
    try {
      const res = await fetch(`/api/items?email=${encodeURIComponent(session.user.email)}`);
      const data = await res.json();
      if (data.success) setItems(data.data);
    } catch (error) { toast.error('ไม่สามารถโหลดข้อมูลสต็อกได้'); }
  };

  useEffect(() => { fetchItems(); }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error('กรุณาระบุชื่อสิ่งของ');
    if (Number(formData.stockQuantity) <= 0) return toast.error('จำนวนต้องมากกว่า 0');
    
    setLoading(true);
    try {
      
      const payload = { ...formData, stockQuantity: Number(formData.stockQuantity), actionBy: session?.user?.name, email: session?.user?.email };
      const res = await fetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'รับเข้าสต็อกสำเร็จ!'); 
        setFormData({ ...formData, name: '', stockQuantity: '' }); fetchItems(); setCurrentPage(1);
      } else { toast.error(data.error); }
    } catch (error) { toast.error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); } finally { setLoading(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer); const workbook = XLSX.read(data, { type: 'array' }); const sheetName = workbook.SheetNames[0]; 
        const rawRows = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[sheetName], { header: 1, defval: '' });
        let headerRowIndex = -1; let nameColIdx = -1, qtyColIdx = -1, catColIdx = -1;

        for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
          const row = rawRows[i];
          if (!Array.isArray(row)) continue;
          for (let j = 0; j < row.length; j++) {
            const cellVal = String(row[j] || '').toLowerCase().replace(/\s/g, ''); 
            if (cellVal.includes('ชื่อ') || cellVal.includes('item') || cellVal.includes('name') || cellVal.includes('รายการ')) nameColIdx = j;
            if (cellVal.includes('จำนวน') || cellVal.includes('qty') || cellVal.includes('quantity')) qtyColIdx = j;
            if (cellVal.includes('หมวด') || cellVal.includes('category')) catColIdx = j;
          }
          if (nameColIdx !== -1 && qtyColIdx !== -1) { headerRowIndex = i; break; }
        }
        if (headerRowIndex === -1) { toast.error('ไม่พบคอลัมน์ "ชื่อสิ่งของ" และ "จำนวน" ในไฟล์'); if(fileInputRef.current) fileInputRef.current.value = ''; return; }

        let uploadData: any[] = [];
        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;
          const itemName = String(row[nameColIdx] || '').trim();
          if (!itemName) continue;
          const qty = Number(String(row[qtyColIdx] || 0).replace(/,/g, ''));
          if (isNaN(qty) || qty <= 0) continue;
          const category = catColIdx !== -1 ? String(row[catColIdx] || '').trim() : 'ระบุภายหลัง';
          
          uploadData.push({ name: itemName, category: category || 'ระบุภายหลัง', stockQuantity: qty, actionBy: session?.user?.name, email: session?.user?.email });
        }

        if (uploadData.length === 0) { toast.error('ไม่พบข้อมูลที่ถูกต้องในไฟล์'); if(fileInputRef.current) fileInputRef.current.value = ''; return; }

        const result = await Swal.fire({ title: 'ยืนยันการรับเข้าสต็อก', text: `รับเข้าคลัง: ${isAdmin ? 'ส่วนกลาง' : 'ประจำศูนย์อพยพ'} จำนวน ${uploadData.length} รายการ`, icon: 'info', showCancelButton: true, confirmButtonText: '✅ ยืนยัน', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#198754' });
        
        if (result.isConfirmed) {
          setLoading(true);
          const response = await fetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(uploadData) });
          const resultData = await response.json();
          if (resultData.success) { toast.success(resultData.message); fetchItems(); setCurrentPage(1); } else { toast.error('ข้อผิดพลาด: ' + resultData.error); }
          setLoading(false);
        }
      } catch (error) { toast.error('เกิดข้อผิดพลาดในการอ่านไฟล์'); } finally { if(fileInputRef.current) fileInputRef.current.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExportStock = () => {
    if (items.length === 0) return toast.error('ไม่มีข้อมูลสต็อกให้ส่งออก');
    const exportData = items.map((item, index) => ({ 'ลำดับ': index + 1, 'ชื่อสิ่งของ': item.name, 'หมวดหมู่': item.category, 'จำนวนคงเหลือในคลัง': item.stockQuantity, 'อัปเดตล่าสุด': new Date(item.updatedAt).toLocaleString('th-TH') }));
    const worksheet = XLSX.utils.json_to_sheet(exportData); const workbook = XLSX.utils.book_new(); worksheet['!cols'] = [{wch: 6}, {wch: 35}, {wch: 15}, {wch: 20}, {wch: 25}]; XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock_Report'); XLSX.writeFile(workbook, `รายงานสต็อก_${isAdmin ? 'ส่วนกลาง' : 'ย่อย'}_${new Date().toISOString().split('T')[0]}.xlsx`); toast.success('ดาวน์โหลดสต็อกสำเร็จ!');
  };

  const filteredItems = items.filter(item => { return item.name.toLowerCase().includes(searchTerm.toLowerCase()) && (filterCategory === 'all' || item.category === filterCategory); });
  const indexOfLastItem = currentPage * itemsPerPage; const indexOfFirstItem = indexOfLastItem - itemsPerPage; const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem); const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterCategory]);

  return (
    <div className="row mt-3">
      {/* 🔴 ซ้ายมือ: ตารางแสดงสต็อกของที่เหลือ */}
      <div className="col-lg-7 mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0 text-primary">📦 สต็อก: {isAdmin ? 'คลังส่วนกลาง' : 'คลังประจำศูนย์อพยพ'}</h5>
          <button onClick={handleExportStock} className="btn btn-sm btn-primary shadow-sm">📤 ส่งออกสต็อก (Excel)</button>
        </div>
        <div className="row g-2 mb-3">
          <div className="col-md-7"><input type="text" className="form-control" placeholder="🔍 ค้นหาสต็อก..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <div className="col-md-5"><select className="form-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}><option value="all">-- ทุกหมวดหมู่ --</option><option value="อาหาร">อาหาร</option><option value="น้ำดื่ม">น้ำดื่ม</option><option value="ยารักษาโรค">ยารักษาโรค</option><option value="เครื่องนุ่งห่ม">เครื่องนุ่งห่ม</option><option value="อุปกรณ์ยังชีพ">อุปกรณ์ยังชีพ</option></select></div>
        </div>
        <div className="card border-0 shadow-sm"><div className="card-body p-0"><div className="table-responsive"><table className="table table-hover align-middle mb-0" style={{ fontSize: '14px' }}><thead className="table-light"><tr><th className="ps-4 border-bottom py-3">ชื่อสิ่งของ</th><th className="border-bottom py-3">หมวดหมู่</th><th className="text-end pe-4 border-bottom py-3">จำนวนคงเหลือ</th></tr></thead><tbody>
          {currentItems.length > 0 ? (currentItems.map((item) => (<tr key={item._id}><td className="ps-4 fw-medium">{item.name}</td><td><span className="badge bg-secondary rounded-pill fw-normal px-2 py-1">{item.category}</span></td><td className="text-end fw-bold text-primary pe-4 fs-5">{item.stockQuantity.toLocaleString()}</td></tr>))) : <tr><td colSpan={3} className="text-center py-5 text-muted">ไม่พบรายการสิ่งของในคลังนี้</td></tr>}
        </tbody></table></div><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div></div>
      </div>

      {/* 🔴 ขวามือ: แบบฟอร์มการรับเข้า */}
      <div className="col-lg-5 mb-4">
        <div className="card border-0 mb-4 shadow-sm">
          <div className="card-header bg-success text-white py-3"><h6 className="mb-0 fw-bold">📥 รับเข้า {isAdmin ? 'คลังส่วนกลาง' : 'คลังศูนย์อพยพ'}</h6></div>
          <div className="card-body">
            <div className="mb-4">
              <label className="form-label fw-bold small text-muted">1. รับเข้าแบบกลุ่ม (ไฟล์ Excel)</label>
              <input type="file" accept=".json, .xlsx, .xls" className="d-none" id="itemFileUpload" ref={fileInputRef} onChange={handleFileUpload} />
              <label htmlFor="itemFileUpload" className="btn btn-outline-success w-100 shadow-sm">📥 คลิกเพื่ออัปโหลดไฟล์ Excel</label>
            </div>
            <hr className="text-secondary opacity-25" />
            <form onSubmit={handleSubmit}>
              <label className="form-label fw-bold mb-3 small text-muted">2. หรือ เพิ่มทีละรายการ</label>
              <div className="mb-3"><label className="form-label small fw-medium">ชื่อสิ่งของ <span className="text-danger">*</span></label><input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
              <div className="mb-3"><label className="form-label small fw-medium">หมวดหมู่</label><select className="form-select" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}><option value="อาหาร">อาหาร</option><option value="น้ำดื่ม">น้ำดื่ม</option><option value="ยารักษาโรค">ยารักษาโรค</option><option value="เครื่องนุ่งห่ม">เครื่องนุ่งห่ม</option><option value="อุปกรณ์ยังชีพ">อุปกรณ์ยังชีพ</option></select></div>
              <div className="mb-4"><label className="form-label small fw-medium">จำนวน <span className="text-danger">*</span></label><input type="number" className="form-control" min="1" value={formData.stockQuantity} onChange={(e) => setFormData({...formData, stockQuantity: e.target.value})} /></div>
              <button type="submit" className="btn btn-success w-100 fw-bold shadow-sm py-2" disabled={loading}>{loading ? 'กำลังบันทึก...' : '✅ ยืนยันการรับเข้าคลัง'}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}