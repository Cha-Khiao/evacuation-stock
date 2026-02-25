'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import Pagination from '@/components/Pagination';

export default function SheltersPage() {
  const [shelters, setShelters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCapacity, setFilterCapacity] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fetchShelters = async () => {
    try {
      const res = await fetch('/api/shelters');
      const data = await res.json();
      if (data.success) setShelters(data.data);
    } catch (error) { toast.error('ไม่สามารถโหลดข้อมูลศูนย์อพยพได้'); }
  };

  useEffect(() => { fetchShelters(); }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Swal.fire({
      title: 'ยืนยันการนำเข้าข้อมูล?', text: `คุณต้องการนำเข้าข้อมูลจากไฟล์ ${file.name} ใช่หรือไม่`, icon: 'question',
      showCancelButton: true, confirmButtonText: 'ใช่, นำเข้าเลย!', cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            let uploadData = [];
            if (file.name.endsWith('.json')) {
              const jsonData = JSON.parse(event.target?.result as string);
              const rawData = jsonData.data || jsonData; 
              uploadData = rawData.map((item: any) => {
                const { _id, ...rest } = item; 
                return { ...rest, district: item.district || 'ไม่ระบุอำเภอ', shelterType: item.shelterType || 'ไม่ระบุประเภท', name: item.name || 'ศูนย์อพยพไม่มีชื่อ' };
              });
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
              const workbook = XLSX.read(event.target?.result, { type: 'binary' });
              const sheetName = workbook.SheetNames[0];
              uploadData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            }

            const response = await fetch('/api/shelters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(uploadData) });
            const resultData = await response.json();

            if (resultData.success) {
              toast.success(`นำเข้าข้อมูลสำเร็จ ${resultData.count} รายการ!`);
              fetchShelters(); setCurrentPage(1);
            } else { toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล'); }
          } catch (error) { toast.error('รูปแบบไฟล์ไม่ถูกต้อง หรือเกิดข้อผิดพลาด'); } 
          finally { setLoading(false); e.target.value = ''; }
        };
        if (file.name.endsWith('.json')) reader.readAsText(file); else reader.readAsBinaryString(file);
      }
    });
  };

  // 🟢 ฟังก์ชันส่งออกศูนย์อพยพเป็น Excel
  const handleExportExcel = () => {
    if (shelters.length === 0) return toast.error('ไม่มีข้อมูลให้ส่งออก');
    const exportData = shelters.map((s, index) => ({
      'ลำดับ': index + 1,
      'ชื่อศูนย์อพยพ': s.name,
      'ประเภท': s.shelterType,
      'อำเภอ/เขต': s.district,
      'ตำบล/แขวง': s.subdistrict || '-',
      'สถานะความจุ': s.capacityStatus,
      'จำนวนที่รองรับได้สูงสุด': s.maxCapacity || 'ไม่ระบุ',
      'เบอร์ติดต่อ': s.phoneNumbers?.join(', ') || '-',
      'อัปเดตล่าสุด': new Date(s.updatedAt).toLocaleString('th-TH')
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    worksheet['!cols'] = [{wch: 6}, {wch: 30}, {wch: 15}, {wch: 20}, {wch: 20}, {wch: 15}, {wch: 25}, {wch: 20}, {wch: 20}];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Shelters_List');
    XLSX.writeFile(workbook, `รายชื่อศูนย์อพยพ_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('ดาวน์โหลดไฟล์ Excel สำเร็จ!');
  };

  const filteredShelters = shelters.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.district.includes(searchTerm);
    const matchType = filterType === 'all' || s.shelterType === filterType;
    const matchCapacity = filterCapacity === 'all' || s.capacityStatus === filterCapacity;
    return matchSearch && matchType && matchCapacity;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentShelters = filteredShelters.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredShelters.length / itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterType, filterCapacity]);

  return (
    <div className="row mt-3">
      <div className="col-12 mb-4 d-flex justify-content-end align-items-center gap-2 flex-wrap">
        <button onClick={handleExportExcel} className="btn btn-primary shadow-sm">📤 ส่งออกรายชื่อ (Excel)</button>
        <input type="file" accept=".json, .xlsx, .xls" className="d-none" id="fileUpload" onChange={handleFileUpload} />
        <label htmlFor="fileUpload" className="btn btn-success mb-0 shadow-sm">{loading ? 'กำลังนำเข้า...' : '📥 นำเข้าข้อมูล (Excel)'}</label>
      </div>

      <div className="col-12">
        <div className="card border-0 mb-4">
          <div className="card-body py-3">
            <div className="row g-2">
              <div className="col-md-4">
                <input type="text" className="form-control" placeholder="🔍 ค้นหาชื่อศูนย์ หรือ อำเภอ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="col-md-4">
                <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="all">-- ทุกประเภท --</option>
                  <option value="ศูนย์พักพิงหลัก">ศูนย์พักพิงหลัก</option>
                  <option value="บ้านญาติ">บ้านญาติ</option>
                </select>
              </div>
              <div className="col-md-4">
                <select className="form-select" value={filterCapacity} onChange={(e) => setFilterCapacity(e.target.value)}>
                  <option value="all">-- ทุกสถานะ --</option>
                  <option value="รองรับได้">รองรับได้</option>
                  <option value="ล้นศูนย์">ล้นศูนย์</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '14px' }}>
                <thead className="table-light">
                  <tr>
                    <th className="ps-4 border-bottom py-3">ชื่อศูนย์อพยพ</th><th className="border-bottom py-3">ประเภท</th><th className="border-bottom py-3">อำเภอ/ตำบล</th><th className="border-bottom py-3">สถานะความจุ</th><th className="pe-4 border-bottom py-3">เบอร์ติดต่อ</th>
                  </tr>
                </thead>
                <tbody>
                  {currentShelters.length > 0 ? (
                    currentShelters.map((shelter) => (
                      <tr key={shelter._id}>
                        <td className="ps-4 fw-medium">{shelter.name}</td>
                        <td><span className={`badge fw-normal ${shelter.shelterType === 'ศูนย์พักพิงหลัก' ? 'bg-primary' : 'bg-info text-dark'}`}>{shelter.shelterType}</span></td>
                        <td>{shelter.district} {shelter.subdistrict ? `/ ${shelter.subdistrict}` : ''}</td>
                        <td><span className={`badge fw-normal ${shelter.capacityStatus === 'ล้นศูนย์' ? 'bg-danger' : 'bg-success'}`}>{shelter.capacityStatus}</span></td>
                        <td className="pe-4">{shelter.phoneNumbers?.[0] || '-'}</td>
                      </tr>
                    ))
                  ) : <tr><td colSpan={5} className="text-center py-5 text-muted">ไม่พบข้อมูลที่ค้นหา</td></tr>}
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