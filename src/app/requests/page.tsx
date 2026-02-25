'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import Pagination from '@/components/Pagination';

export default function RequestsPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [items, setItems] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const reqsPerPage = 10;
  
  // Ref สำหรับอัปโหลดไฟล์ Excel
  const fileInputRef = useRef<HTMLInputElement>(null);

  // สำหรับ Staff ขอเบิก (แบบกรอกมือ)
  const [cart, setCart] = useState<any[]>([]);
  const [currentItem, setCurrentItem] = useState({ id: '', quantity: '' });
  const [note, setNote] = useState('');

  // ฟังก์ชันโหลดข้อมูล
  const fetchData = async () => {
    try {
      const [itemsRes, reqRes] = await Promise.all([ fetch('/api/items'), fetch('/api/requests') ]);
      const itemsData = await itemsRes.json();
      const reqData = await reqRes.json();
      
      if (itemsData.success) setItems(itemsData.data);
      if (reqData.success) {
        if (!isAdmin) {
          setRequests(reqData.data.filter((r: any) => r.requestedBy === session?.user?.name));
        } else {
          setRequests(reqData.data);
        }
      }
    } catch (error) { toast.error('โหลดข้อมูลล้มเหลว'); }
  };

  useEffect(() => { if(session) fetchData(); }, [session]);

  // STAFF: เพิ่มของลงตะกร้าคำขอ (กรอกมือ)
  const handleAddToCart = () => {
    if (!currentItem.id || !currentItem.quantity || Number(currentItem.quantity) <= 0) return toast.error('ระบุสิ่งของและจำนวนให้ถูกต้อง');
    const selectedItemData = items.find(i => i._id === currentItem.id);
    if (!selectedItemData) return;
    
    if (Number(currentItem.quantity) > selectedItemData.stockQuantity) return toast.error(`สต็อกไม่พอ! (มีแค่ ${selectedItemData.stockQuantity})`);
    
    const existingIndex = cart.findIndex(c => c.itemId === currentItem.id);
    if (existingIndex > -1) {
      const newCart = [...cart]; const newQty = newCart[existingIndex].quantity + Number(currentItem.quantity);
      if (newQty > selectedItemData.stockQuantity) return toast.error(`จำนวนรวมเกินสต็อก!`);
      newCart[existingIndex].quantity = newQty; setCart(newCart);
    } else {
      setCart([...cart, { itemId: selectedItemData._id, itemName: selectedItemData.name, quantity: Number(currentItem.quantity) }]);
    }
    setCurrentItem({ id: '', quantity: '' });
  };

  // STAFF: ส่งคำขอเบิกไปยังส่วนกลาง (กรอกมือ)
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return toast.error('กรุณาเพิ่มรายการสิ่งของ');
    
    setLoading(true);
    try {
      const payload = { email: session?.user?.email, requestedBy: session?.user?.name, items: cart, note };
      const res = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message); setCart([]); setNote(''); fetchData();
      } else { toast.error(data.error); }
    } catch (error) { toast.error('เกิดข้อผิดพลาด'); } finally { setLoading(false); }
  };

  // 🟢 STAFF: นำเข้าไฟล์ Excel เป็นคำขอเบิก (Import Excel)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const rawRows = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[sheetName], { header: 1, defval: '' });
        
        let headerRowIndex = -1; let nameColIdx = -1, qtyColIdx = -1;

        for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
          const row = rawRows[i];
          if (!Array.isArray(row)) continue;
          for (let j = 0; j < row.length; j++) {
            const cellVal = String(row[j] || '').toLowerCase().replace(/\s/g, ''); 
            if (cellVal.includes('ชื่อ') || cellVal.includes('item') || cellVal.includes('name') || cellVal.includes('รายการ')) nameColIdx = j;
            if (cellVal.includes('จำนวน') || cellVal.includes('qty') || cellVal.includes('quantity')) qtyColIdx = j;
          }
          if (nameColIdx !== -1 && qtyColIdx !== -1) { headerRowIndex = i; break; }
        }

        if (headerRowIndex === -1) { toast.error('ไม่พบคอลัมน์ "ชื่อสิ่งของ" และ "จำนวน"'); if(fileInputRef.current) fileInputRef.current.value = ''; return; }

        let hasErrorInRow = false; const uploadData = [];

        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;
          const itemName = String(row[nameColIdx] || '').trim();
          if (!itemName) continue;
          const rawQty = row[qtyColIdx] || 0;
          const qty = Number(String(rawQty).replace(/,/g, ''));
          if (qty <= 0 || isNaN(qty)) continue;

          let rowError = '';
          const foundItem = items.find(itm => itm.name === itemName);
          if (!foundItem) { 
            rowError += `[ไม่พบสิ่งของในระบบ]`; 
          } else if (foundItem.stockQuantity < qty) { 
            rowError += `[สต็อกไม่พอ มี ${foundItem.stockQuantity}]`; 
          }

          if (rowError) hasErrorInRow = true;
          uploadData.push({ itemId: foundItem?._id, itemName: itemName, quantity: qty, errorMsg: rowError });
        }

        if (uploadData.length === 0) { toast.error('ไม่พบข้อมูลสิ่งของ'); if(fileInputRef.current) fileInputRef.current.value = ''; return; }

        let tableHtml = `<div class="text-start mb-2 text-body" style="font-size: 14px;">พบข้อมูลเตรียมขอเบิก <b>${uploadData.length}</b> รายการ</div>
          <div style="max-height: 300px; overflow-y: auto; border: 1px solid var(--bs-border-color); border-radius: 5px;"><table class="table table-sm table-hover mb-0" style="font-size: 14px;"><thead style="position: sticky; top: 0; z-index: 1;"><tr><th class="text-start ps-2 border-bottom bg-body">สิ่งของ</th><th class="text-end border-bottom bg-body">จำนวน</th><th class="text-start pe-2 border-bottom bg-body">สถานะ</th></tr></thead><tbody>`;
        uploadData.slice(0, 100).forEach(item => { tableHtml += `<tr class="${item.errorMsg ? 'table-warning' : ''}"><td class="text-start ps-2">${item.itemName}</td><td class="text-end fw-bold text-primary">${item.quantity.toLocaleString()}</td><td class="text-start pe-2 text-danger" style="font-size: 12px;">${item.errorMsg || '<span class="text-success">พร้อมส่งคำขอ</span>'}</td></tr>`; });
        tableHtml += `</tbody></table></div>`;

        const result = await Swal.fire({ 
          title: `ตรวจสอบคำขอเบิก (Excel)`, 
          html: tableHtml, 
          width: '700px', 
          showCancelButton: true, 
          confirmButtonText: hasErrorInRow ? '⚠️ ส่งคำขอ (ข้ามรายการที่ Error)' : '🚀 ยืนยันส่งคำขอเบิก', 
          cancelButtonText: 'ยกเลิก', 
          confirmButtonColor: hasErrorInRow ? '#ffc107' : '#0d6efd', 
          background: 'var(--bs-body-bg)', 
          color: 'var(--bs-body-color)' 
        });
        
        if (result.isConfirmed) {
          const validItems = uploadData.filter(item => !item.errorMsg);
          if (validItems.length === 0) {
             toast.error('ไม่มีรายการที่สามารถส่งคำขอได้'); return;
          }

          setLoading(true); 
          const payload = {
            email: session?.user?.email,
            requestedBy: session?.user?.name,
            items: validItems.map(v => ({ itemId: v.itemId, itemName: v.itemName, quantity: v.quantity })),
            note: 'ส่งคำขอเบิกผ่านไฟล์ Excel'
          };

          const response = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); 
          const resultData = await response.json();
          if (resultData.success) { toast.success(resultData.message); fetchData(); } else { toast.error(resultData.error); }
          setLoading(false);
        }
      } catch (error) { toast.error('ไฟล์มีปัญหา หรือรูปแบบข้อมูลไม่ถูกต้อง'); } finally { if(fileInputRef.current) fileInputRef.current.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  };

  // ADMIN: กดอนุมัติ
  const handleApprove = async (requestId: string) => {
    Swal.fire({ 
      title: 'ยืนยันการอนุมัติ?', 
      text: 'ระบบจะออกประวัติการเบิกจ่ายให้ศูนย์นี้ทันที', 
      icon: 'question', 
      showCancelButton: true, 
      confirmButtonText: '✅ อนุมัติคำขอ', 
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#198754'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await fetch('/api/requests', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId, status: 'APPROVED', actionBy: session?.user?.name }) });
        const data = await res.json();
        if (data.success) { toast.success('อนุมัติสำเร็จ'); fetchData(); } else toast.error(data.error);
      }
    });
  };

  // ADMIN: กดปฏิเสธ (คืนสต็อก)
  const handleReject = async (requestId: string) => {
    Swal.fire({ 
      title: 'ปฏิเสธคำขอเบิก?', 
      text: 'สต็อกที่ถูกจองไว้จะถูกคืนกลับเข้าคลังอัตโนมัติ กรุณาระบุเหตุผล:', 
      input: 'text', 
      inputPlaceholder: 'เช่น จำนวนเกินกำหนด, ของหมด...', 
      showCancelButton: true, 
      confirmButtonText: '❌ ปฏิเสธและคืนสต็อก', 
      confirmButtonColor: '#dc3545', 
      cancelButtonText: 'ยกเลิก' 
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await fetch('/api/requests', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId, status: 'REJECTED', actionBy: session?.user?.name, rejectReason: result.value || 'ไม่อนุมัติโดยส่วนกลาง' }) });
        const data = await res.json();
        if (data.success) { toast.success('ปฏิเสธและคืนสต็อกสำเร็จ'); fetchData(); } else toast.error(data.error);
      }
    });
  };

  const indexOfLastReq = currentPage * reqsPerPage;
  const indexOfFirstReq = indexOfLastReq - reqsPerPage;
  const currentReqs = requests.slice(indexOfFirstReq, indexOfLastReq);
  const totalPages = Math.ceil(requests.length / reqsPerPage);

  return (
    <div className="row mt-3">
      {/* ==============================================
          🔴 ฟอร์มสำหรับ STAFF ขอเบิก (มีปุ่มอัปโหลด Excel ด้วย)
          ============================================== */}
      {!isAdmin && (
        <div className="col-lg-5 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-primary text-white py-3 d-flex align-items-center">
              <h6 className="mb-0 fw-bold fs-5">📝 สร้างคำขอเบิกสิ่งของ</h6>
            </div>
            <div className="card-body bg-body-tertiary">
              
              <div className="alert alert-primary bg-primary bg-opacity-10 border-0 text-primary-emphasis mb-4 shadow-sm">
                <i className="bi bi-info-circle-fill me-2"></i>
                <strong>ศูนย์อพยพของคุณ:</strong> ระบบตรวจพบอัตโนมัติจากบัญชีล็อกอิน
              </div>

              {/* 🟢 ส่วนที่ 1: อัปโหลดไฟล์ Excel */}
              <div className="mb-4">
                <label className="form-label fw-bold text-muted small mb-2">1. นำเข้าคำขอเบิกด้วยไฟล์ Excel</label>
                <input type="file" accept=".xlsx, .xls" className="d-none" id="reqFileUpload" ref={fileInputRef} onChange={handleFileUpload} />
                <label htmlFor="reqFileUpload" className="btn btn-outline-primary w-100 shadow-sm">
                  📥 คลิกเพื่ออัปโหลดไฟล์คำขอเบิก
                </label>
                <small className="text-muted mt-1 d-block">ไฟล์ควรมีคอลัมน์ "ชื่อสิ่งของ" และ "จำนวน"</small>
              </div>

              <hr className="text-secondary opacity-25" />

              <form onSubmit={handleSubmitRequest}>
                
                {/* 🟢 ส่วนที่ 2: เพิ่มทีละรายการ (กรอกมือ) */}
                <label className="form-label fw-bold text-muted small mb-2">2. หรือ เพิ่มทีละรายการ</label>
                <div className="card border-0 shadow-sm mb-3">
                  <div className="card-body p-3">
                    <div className="mb-3">
                      <select className="form-select border-primary" value={currentItem.id} onChange={(e) => setCurrentItem({...currentItem, id: e.target.value})}>
                        <option value="">-- คลิกเพื่อค้นหาสิ่งของ --</option>
                        {items.filter(item => item.stockQuantity > 0).map(item => (<option key={item._id} value={item._id}>{item.name} (ในคลังมี: {item.stockQuantity})</option>))}
                      </select>
                    </div>
                    <div className="d-flex gap-2">
                      <input type="number" className="form-control border-primary" placeholder="ระบุจำนวน" min="1" value={currentItem.quantity} onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})} />
                      <button type="button" className="btn btn-primary px-4 fw-bold shadow-sm" onClick={handleAddToCart}>
                        ➕ เพิ่มรายการ
                      </button>
                    </div>
                  </div>
                </div>

                {cart.length > 0 && (
                  <div className="mb-4">
                    <label className="form-label fw-bold text-muted small mb-2">รายการที่รอส่งคำขอ ({cart.length} ชิ้น)</label>
                    <div className="card border-primary border-opacity-50 bg-body">
                      <ul className="list-group list-group-flush rounded">
                        {cart.map((c, idx) => (
                          <li key={idx} className="list-group-item d-flex justify-content-between align-items-center py-2 border-bottom">
                            <span className="fw-medium text-truncate" style={{maxWidth: '65%'}}>{c.itemName}</span>
                            <div>
                              <span className="badge bg-primary rounded-pill px-3 py-2 me-2 fs-6">{c.quantity}</span>
                              <button type="button" className="btn btn-sm btn-outline-danger px-2 border-0" onClick={() => { const newCart = [...cart]; newCart.splice(idx, 1); setCart(newCart); }} title="ลบออก">❌</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="form-label fw-bold text-muted small mb-2">3. เหตุผลความจำเป็น (พิมพ์หรือไม่ก็ได้)</label>
                  <input type="text" className="form-control shadow-sm" placeholder="เช่น จำนวนผู้ลี้ภัยเพิ่มขึ้น..." value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                
                <hr className="text-secondary opacity-25" />
                
                <button type="submit" className="btn btn-primary btn-lg w-100 fw-bold shadow-sm" disabled={loading || cart.length === 0}>
                  {loading ? 'กำลังส่งคำขอ...' : '🚀 ยืนยันการส่งคำขอเบิกไปส่วนกลาง'}
                </button>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* ==============================================
          🔴 ตารางแสดงรายการคำขอเบิก (ใช้ร่วมกัน)
          ============================================== */}
      <div className={isAdmin ? "col-12" : "col-lg-7"}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0 fw-bold text-primary">{isAdmin ? '🛎️ รายการรอพิจารณาอนุมัติ' : '🗂️ ติดตามสถานะคำขอของคุณ'}</h5>
        </div>
        
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '14px' }}>
                <thead className="table-light">
                  <tr>
                    <th className="ps-4 py-3">ส่งคำขอเมื่อ</th>
                    {isAdmin && <th className="py-3">ผู้เบิก / ศูนย์อพยพ</th>}
                    <th className="py-3">รายการสิ่งของที่ขอ</th>
                    <th className="py-3">สถานะคำขอ</th>
                    {isAdmin && <th className="text-center pe-4 py-3">พิจารณาโดยส่วนกลาง</th>}
                  </tr>
                </thead>
                <tbody>
                  {currentReqs.length > 0 ? (
                    currentReqs.map((req) => (
                      <tr key={req._id}>
                        <td className="ps-4 text-muted small">{new Date(req.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} น.</td>
                        
                        {isAdmin && (
                          <td className="fw-medium text-primary">
                            {req.shelterId?.name || 'ไม่ทราบศูนย์'} <br/>
                            <span className="badge bg-secondary rounded-pill fw-normal mt-1 text-light">👤 {req.requestedBy}</span>
                          </td>
                        )}
                        
                        <td>
                          <ul className="mb-0 ps-3 mt-1 small">
                            {req.items.map((it: any, i: number) => <li key={i} className="mb-1"><span className="fw-bold">{it.itemName}</span> (จำนวน: {it.quantity})</li>)}
                          </ul>
                          {req.note && <div className="small text-muted mt-2 px-2 py-1 bg-light rounded fst-italic">"{req.note}"</div>}
                        </td>
                        
                        <td>
                          {req.status === 'PENDING' && <span className="badge bg-warning text-dark px-3 py-2 rounded-pill shadow-sm">⏳ รอส่วนกลางอนุมัติ</span>}
                          {req.status === 'APPROVED' && <><span className="badge bg-success px-3 py-2 rounded-pill shadow-sm">✅ อนุมัติแล้ว</span><div className="small text-muted mt-1 fw-medium">อนุมัติโดย: {req.actionBy}</div></>}
                          {req.status === 'REJECTED' && <><span className="badge bg-danger px-3 py-2 rounded-pill shadow-sm">❌ ถูกปฏิเสธ</span><div className="small text-danger mt-1 fw-medium">เหตุผล: {req.rejectReason}</div></>}
                        </td>
                        
                        {isAdmin && (
                          <td className="text-center pe-4">
                            {req.status === 'PENDING' ? (
                              <div className="d-flex flex-column gap-2 align-items-center">
                                <button className="btn btn-sm btn-success fw-bold shadow-sm w-75" onClick={() => handleApprove(req._id)}>✅ อนุมัติ</button>
                                <button className="btn btn-sm btn-outline-danger fw-bold w-75" onClick={() => handleReject(req._id)}>❌ ปฏิเสธ</button>
                              </div>
                            ) : (
                              <span className="text-muted small fw-medium">จบกระบวนการแล้ว</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  ) : <tr><td colSpan={isAdmin ? 5 : 4} className="text-center py-5 text-muted">ยังไม่มีประวัติการส่งคำขอเบิกสิ่งของ</td></tr>}
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