'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react'; 
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import Pagination from '@/components/Pagination';

export default function TransactionsPage() {
  const { data: session } = useSession(); 
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [items, setItems] = useState<any[]>([]);
  const [shelters, setShelters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
  const [formData, setFormData] = useState({ destinationShelterId: '', recipientName: '', note: '' });
  const [cart, setCart] = useState<any[]>([]);
  const [currentItem, setCurrentItem] = useState({ id: '', quantity: '' });

  const fetchData = async () => {
    if (!session?.user?.email) return;
    try {
      const [itemsRes, sheltersRes] = await Promise.all([ fetch(`/api/items?email=${encodeURIComponent(session.user.email)}`), fetch('/api/shelters') ]);
      const itemsData = await itemsRes.json(); const sheltersData = await sheltersRes.json();
      if (itemsData.success) setItems(itemsData.data); if (sheltersData.success) setShelters(sheltersData.data);
    } catch (error) { toast.error('โหลดข้อมูลล้มเหลว'); }
  };

  useEffect(() => { fetchData(); }, [session]);

  const handleAddToCart = () => {
    if (!currentItem.id || !currentItem.quantity || Number(currentItem.quantity) <= 0) return toast.error('ระบุสิ่งของและจำนวนให้ถูกต้อง');
    const selectedItemData = items.find(i => i._id === currentItem.id);
    if (!selectedItemData) return;
    if (Number(currentItem.quantity) > selectedItemData.stockQuantity) return toast.error(`สต็อกคลังของคุณไม่พอ! (มีแค่ ${selectedItemData.stockQuantity})`);
    
    const existingIndex = cart.findIndex(c => c.id === currentItem.id);
    if (existingIndex > -1) {
      const newCart = [...cart]; const newQty = newCart[existingIndex].quantity + Number(currentItem.quantity);
      if (newQty > selectedItemData.stockQuantity) return toast.error(`จำนวนรวมเกินสต็อก!`);
      newCart[existingIndex].quantity = newQty; setCart(newCart);
    } else setCart([...cart, { id: selectedItemData._id, name: selectedItemData.name, category: selectedItemData.category, quantity: Number(currentItem.quantity) }]);
    setCurrentItem({ id: '', quantity: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin && !formData.destinationShelterId) return toast.error('Admin ต้องระบุศูนย์ปลายทางที่จะจ่ายของ');
    if (!isAdmin && !formData.recipientName && !formData.note) return toast.error('กรุณาระบุชื่อผู้รับ หรือเหตุผลการจ่ายของ');
    if (cart.length === 0) return toast.error('กรุณาเพิ่มสิ่งของลงตะกร้าอย่างน้อย 1 ชิ้น');
    
    setLoading(true);
    try {
      let finalNote = formData.note;
      if (!isAdmin && formData.recipientName) finalNote = `ผู้รับ: ${formData.recipientName} ` + (formData.note ? `(${formData.note})` : '');

      const payload = cart.map(c => ({ itemName: c.name, quantity: c.quantity, destinationShelterId: isAdmin ? formData.destinationShelterId : '', actionBy: session?.user?.name, note: finalNote, email: session?.user?.email }));
      const res = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) { toast.success(data.message); setCart([]); setFormData({ destinationShelterId: '', recipientName: '', note: '' }); fetchData(); } else toast.error(data.error);
    } catch (error) { toast.error('เกิดข้อผิดพลาด'); } finally { setLoading(false); }
  };

  // 🟢 ฟังก์ชันอัปโหลด Excel (นำกลับมาใส่ให้แล้ว และแยกเงื่อนไข Admin/Staff)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAdmin && !formData.destinationShelterId) {
      toast.error('Admin ต้องเลือกศูนย์อพยพปลายทางก่อนอัปโหลดไฟล์เบิกจ่าย'); e.target.value = ''; return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer); const workbook = XLSX.read(data, { type: 'array' }); const sheetName = workbook.SheetNames[0];
        const rawRows = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[sheetName], { header: 1, defval: '' });
        let headerRowIndex = -1; let nameColIdx = -1, qtyColIdx = -1;

        for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
          const row = rawRows[i]; if (!Array.isArray(row)) continue;
          for (let j = 0; j < row.length; j++) {
            const cellVal = String(row[j] || '').toLowerCase().replace(/\s/g, ''); 
            if (cellVal.includes('ชื่อ') || cellVal.includes('item') || cellVal.includes('name') || cellVal.includes('รายการ')) nameColIdx = j;
            if (cellVal.includes('จำนวน') || cellVal.includes('qty') || cellVal.includes('quantity')) qtyColIdx = j;
          }
          if (nameColIdx !== -1 && qtyColIdx !== -1) { headerRowIndex = i; break; }
        }
        if (headerRowIndex === -1) { toast.error('ไม่พบคอลัมน์ "ชื่อสิ่งของ" และ "จำนวน"'); if(fileInputRef.current) fileInputRef.current.value = ''; return; }

        let hasErrorInRow = false; const uploadData = [];
        const selectedShelterName = isAdmin ? shelters.find(s => s._id === formData.destinationShelterId)?.name : 'แจกจ่ายหน้างาน (ผ่าน Excel)';

        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
          const row = rawRows[i]; if (!row || row.length === 0) continue;
          const itemName = String(row[nameColIdx] || '').trim(); if (!itemName) continue;
          const qty = Number(String(row[qtyColIdx] || 0).replace(/,/g, '')); if (qty <= 0 || isNaN(qty)) continue;

          let rowError = '';
          const foundItem = items.find(itm => itm.name === itemName);
          if (!foundItem) rowError += `[ไม่พบในคลังของคุณ]`; else if (foundItem.stockQuantity < qty) rowError += `[สต็อกไม่พอ มี ${foundItem.stockQuantity}]`;
          if (rowError) hasErrorInRow = true;

          let finalNote = 'เบิกจ่ายผ่าน Excel';
          if (!isAdmin && formData.recipientName) finalNote = `ผู้รับ: ${formData.recipientName} (เบิกผ่าน Excel)`;

          uploadData.push({ itemName: itemName, quantity: qty, destinationShelterId: isAdmin ? formData.destinationShelterId : '', actionBy: session?.user?.name, note: finalNote, email: session?.user?.email, errorMsg: rowError });
        }

        if (uploadData.length === 0) { toast.error('ไม่พบข้อมูลสิ่งของ'); if(fileInputRef.current) fileInputRef.current.value = ''; return; }

        let tableHtml = `<div class="text-start mb-2 text-body" style="font-size: 14px;">ปลายทาง: <b>${selectedShelterName}</b></div><div style="max-height: 300px; overflow-y: auto; border: 1px solid var(--bs-border-color); border-radius: 5px;"><table class="table table-sm table-hover mb-0" style="font-size: 14px;"><thead style="position: sticky; top: 0; z-index: 1;"><tr><th class="text-start ps-2 border-bottom bg-body">สิ่งของ</th><th class="text-end border-bottom bg-body">จำนวน</th><th class="text-start pe-2 border-bottom bg-body">สถานะ</th></tr></thead><tbody>`;
        uploadData.slice(0, 100).forEach(item => { tableHtml += `<tr class="${item.errorMsg ? 'table-warning' : ''}"><td class="text-start ps-2">${item.itemName}</td><td class="text-end fw-bold text-danger">-${item.quantity.toLocaleString()}</td><td class="text-start pe-2 text-danger" style="font-size: 12px;">${item.errorMsg || '<span class="text-success">พร้อมบันทึก</span>'}</td></tr>`; });
        tableHtml += `</tbody></table></div>`;

        const result = await Swal.fire({ title: `ตรวจสอบการเบิกจ่าย`, html: tableHtml, width: '700px', showCancelButton: true, confirmButtonText: hasErrorInRow ? '⚠️ ยืนยัน (ข้าม Error)' : '✅ ยืนยันเบิกจ่าย', cancelButtonText: 'ยกเลิก', confirmButtonColor: hasErrorInRow ? '#ffc107' : '#198754' });
        
        if (result.isConfirmed) {
          setLoading(true); 
          const validData = uploadData.filter(d => !d.errorMsg);
          const response = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validData) }); 
          const resultData = await response.json();
          if (resultData.success) { toast.success(resultData.message); fetchData(); } else toast.error(resultData.error);
          setLoading(false);
        }
      } catch (error) { toast.error('ไฟล์มีปัญหา หรือรูปแบบข้อมูลไม่ถูกต้อง'); } finally { if(fileInputRef.current) fileInputRef.current.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExportStock = () => {
    if (items.length === 0) return toast.error('ไม่มีสต็อกให้ส่งออก');
    const exportData = items.map((item, index) => ({ 'ลำดับ': index + 1, 'ชื่อสิ่งของ': item.name, 'หมวดหมู่': item.category, 'จำนวนคงเหลือพร้อมเบิก': item.stockQuantity }));
    const worksheet = XLSX.utils.json_to_sheet(exportData); const workbook = XLSX.utils.book_new(); worksheet['!cols'] = [{wch: 6}, {wch: 35}, {wch: 15}, {wch: 20}]; XLSX.utils.book_append_sheet(workbook, worksheet, 'Available_Stock'); XLSX.writeFile(workbook, `สต็อกพร้อมเบิก_${isAdmin ? 'ส่วนกลาง' : 'ศูนย์อพยพ'}_${new Date().toISOString().split('T')[0]}.xlsx`); toast.success('ดาวน์โหลดสต็อกสำเร็จ!');
  };

  const filteredItems = items.filter(item => { return item.name.toLowerCase().includes(searchTerm.toLowerCase()) && (filterCategory === 'all' || item.category === filterCategory); });
  const indexOfLastItem = currentPage * itemsPerPage; const indexOfFirstItem = indexOfLastItem - itemsPerPage; const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem); const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterCategory]);

  return (
    <div className="row mt-3">
      <div className="col-lg-7 mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0 text-primary">📦 สต็อกพร้อมจ่าย: {isAdmin ? 'ส่วนกลาง' : 'ประจำศูนย์อพยพ'}</h5>
          <button onClick={handleExportStock} className="btn btn-sm btn-primary shadow-sm">📤 ส่งออกสต็อก (Excel)</button>
        </div>
        <div className="row g-2 mb-3">
          <div className="col-md-7"><input type="text" className="form-control" placeholder="🔍 ค้นหาสต็อก..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <div className="col-md-5"><select className="form-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}><option value="all">-- ทุกหมวดหมู่ --</option><option value="อาหาร">อาหาร</option><option value="น้ำดื่ม">น้ำดื่ม</option><option value="ยารักษาโรค">ยารักษาโรค</option></select></div>
        </div>
        <div className="card border-0 shadow-sm"><div className="card-body p-0"><div className="table-responsive"><table className="table table-hover align-middle mb-0" style={{ fontSize: '14px' }}><thead className="table-light"><tr><th className="ps-4 border-bottom py-3">ชื่อสิ่งของ</th><th className="border-bottom py-3">หมวดหมู่</th><th className="text-end pe-4 border-bottom py-3">คงเหลือ</th></tr></thead><tbody>
          {currentItems.length > 0 ? (currentItems.map((item) => (<tr key={item._id}><td className="ps-4 fw-medium">{item.name}</td><td><span className="badge bg-secondary rounded-pill fw-normal px-2 py-1">{item.category}</span></td><td className="text-end fw-bold text-primary pe-4 fs-5">{item.stockQuantity.toLocaleString()}</td></tr>))) : <tr><td colSpan={3} className="text-center py-5 text-muted">ไม่พบสต็อกในคลังของคุณ</td></tr>}
        </tbody></table></div><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div></div>
      </div>

      <div className="col-lg-5 mb-4">
        <div className="card border-0 mb-4 shadow-sm">
          <div className="card-header bg-danger text-white py-3"><h6 className="mb-0 fw-bold">📤 {isAdmin ? 'จ่ายของลงศูนย์อพยพ (ส่วนกลาง)' : 'แจกจ่ายสิ่งของให้ผู้ประสบภัยหน้างาน'}</h6></div>
          <div className="card-body">
            
            {isAdmin ? (
              <div className="mb-4 p-3 border border-danger rounded bg-body-tertiary">
                <label className="form-label text-danger fw-bold mb-2 small">1. ส่งไปที่ศูนย์อพยพใด <span className="text-danger">*</span></label>
                <select className="form-select border-danger shadow-sm" value={formData.destinationShelterId} onChange={(e) => setFormData({...formData, destinationShelterId: e.target.value})}>
                  <option value="">-- เลือกศูนย์ปลายทาง --</option>
                  {shelters.map(shelter => (<option key={shelter._id} value={shelter._id}>{shelter.name}</option>))}
                </select>
              </div>
            ) : (
              <div className="mb-4 p-3 border border-info rounded bg-body-tertiary">
                <label className="form-label text-info-emphasis fw-bold mb-2 small">1. ระบุชื่อผู้รับ (ผู้ประสบภัย/ตัวแทน)</label>
                <input type="text" className="form-control border-info shadow-sm" placeholder="เช่น นายประยุทธ์ (ผู้ใหญ่บ้าน ม.1)" value={formData.recipientName} onChange={(e) => setFormData({...formData, recipientName: e.target.value})} />
              </div>
            )}

            {/* 🟢 ปุ่มอัปโหลด Excel (เพิ่มกลับเข้ามาให้แล้ว) */}
            <div className="mb-4">
              <label className="form-label fw-bold small text-muted">2. จ่ายออกแบบกลุ่ม (ไฟล์ Excel)</label>
              <input type="file" accept=".xlsx, .xls" className="d-none" id="txFileUpload" ref={fileInputRef} onChange={handleFileUpload} />
              <label htmlFor="txFileUpload" className="btn btn-outline-danger w-100 shadow-sm">
                📥 คลิกเพื่ออัปโหลดไฟล์รายการเบิกจ่าย
              </label>
            </div>

            <hr className="text-secondary opacity-25" />

            <form onSubmit={handleSubmit}>
              <label className="form-label fw-bold mb-3 small text-muted">3. หรือ เลือกรายการบนระบบ</label>
              <div className="row g-2 mb-3">
                <div className="col-7">
                  <select className="form-select" value={currentItem.id} onChange={(e) => setCurrentItem({...currentItem, id: e.target.value})}>
                    <option value="">-- ค้นหาสิ่งของ --</option>
                    {items.filter(item => item.stockQuantity > 0).map(item => (<option key={item._id} value={item._id}>{item.name} (มี: {item.stockQuantity})</option>))}
                  </select>
                </div>
                <div className="col-3"><input type="number" className="form-control" placeholder="จำนวน" min="1" value={currentItem.quantity} onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})} /></div>
                <div className="col-2"><button type="button" className="btn btn-primary w-100 fw-bold" onClick={handleAddToCart}>เพิ่ม</button></div>
              </div>
              
              {cart.length > 0 && (
                <div className="mb-4 border rounded p-2 bg-body">
                  <ul className="list-group list-group-flush">
                    {cart.map((c, idx) => (
                      <li key={idx} className="list-group-item d-flex justify-content-between align-items-center py-2 border-bottom">
                        <span className="fw-medium text-truncate" style={{maxWidth: '65%'}}>{c.name}</span>
                        <div><span className="badge bg-danger rounded-pill px-3 py-2 me-2">-{c.quantity}</span><button type="button" className="btn btn-sm btn-outline-secondary px-2 border-0" onClick={() => { const newCart = [...cart]; newCart.splice(idx, 1); setCart(newCart); }}>❌</button></div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mb-4"><label className="form-label small fw-medium">หมายเหตุเพิ่มเติม</label><input type="text" className="form-control shadow-sm" placeholder={isAdmin ? "เช่น ทะเบียนรถบรรทุก" : "เช่น แจกให้ชาวบ้านที่มารับเอง"} value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} /></div>
              <button type="submit" className="btn btn-danger btn-lg w-100 fw-bold shadow-sm" disabled={loading || cart.length === 0}>{loading ? 'กำลังบันทึก...' : `📤 ยืนยันตัดสต็อกจ่ายออก`}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}