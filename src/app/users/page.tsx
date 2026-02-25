'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import Pagination from '@/components/Pagination';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [shelters, setShelters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'STAFF', shelterId: '' });

  const fetchData = async () => {
    try {
      const [usersRes, sheltersRes] = await Promise.all([fetch('/api/users'), fetch('/api/shelters')]);
      const usersData = await usersRes.json();
      const sheltersData = await sheltersRes.json();
      
      if (usersData.success) setUsers(usersData.data);
      if (sheltersData.success) setShelters(sheltersData.data);
    } catch (error) { toast.error('โหลดข้อมูลล้มเหลว'); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) return toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
    if (formData.role === 'STAFF' && !formData.shelterId) return toast.error('กรุณาระบุศูนย์อพยพประจำตัวของเจ้าหน้าที่');

    setLoading(true);
    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setFormData({ name: '', email: '', password: '', role: 'STAFF', shelterId: '' });
        fetchData();
      } else {
        toast.error(data.error);
      }
    } catch (error) { toast.error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    Swal.fire({
      title: 'ยืนยันการลบบัญชี?',
      text: `คุณต้องการลบบัญชี "${name}" ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'ลบทิ้ง',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            toast.success('ลบข้อมูลสำเร็จ');
            fetchData();
          } else { toast.error(data.error); }
        } catch (error) { toast.error('เกิดข้อผิดพลาด'); }
      }
    });
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  return (
    <div className="row mt-3">
      {/* ซ้ายมือ: ตารางรายชื่อผู้ใช้งาน */}
      <div className="col-lg-8 mb-4">
        <div className="card shadow-sm border-0 mb-3 bg-body-tertiary">
          <div className="card-body py-2">
            <input type="text" className="form-control shadow-sm" placeholder="🔍 ค้นหาชื่อ หรือ อีเมล..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="card shadow-sm border-0">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '14px' }}>
                <thead className="table-light">
                  <tr>
                    <th className="ps-4 border-bottom py-3">ชื่อ-นามสกุล</th>
                    <th className="border-bottom py-3">อีเมลเข้าสู่ระบบ</th>
                    <th className="border-bottom py-3">ตำแหน่ง / สิทธิ์</th>
                    <th className="border-bottom py-3">ประจำศูนย์อพยพ</th>
                    <th className="text-center pe-4 border-bottom py-3">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.length > 0 ? (
                    currentUsers.map((user) => (
                      <tr key={user._id}>
                        <td className="ps-4 fw-medium">{user.name}</td>
                        <td className="text-muted">{user.email}</td>
                        <td>
                          {user.role === 'ADMIN' ? 
                            <span className="badge bg-primary px-2 py-1 fw-normal">ผู้อำนวยการศูนย์ (Admin)</span> : 
                            <span className="badge bg-info text-dark px-2 py-1 fw-normal">เจ้าหน้าที่ (Staff)</span>
                          }
                        </td>
                        <td className="text-secondary small">{user.shelterId?.name || '-'}</td>
                        <td className="text-center pe-4">
                          <button onClick={() => handleDelete(user._id, user.name)} className="btn btn-sm btn-outline-danger shadow-sm">ลบ</button>
                        </td>
                      </tr>
                    ))
                  ) : <tr><td colSpan={5} className="text-center py-5 text-muted">ไม่พบบัญชีผู้ใช้งาน</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </div>
      </div>

      {/* ขวามือ: ฟอร์มสร้างบัญชีใหม่ */}
      <div className="col-lg-4 mb-4">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-primary text-white py-2"><h6 className="mb-0 mt-1 fw-bold">➕ สร้างบัญชีเข้าใช้งานใหม่</h6></div>
          <div className="card-body bg-body-tertiary">
            <form onSubmit={handleSubmit}>
              
              <div className="mb-3">
                <label className="form-label small fw-bold">ระดับสิทธิ์ผู้ใช้งาน <span className="text-danger">*</span></label>
                <select className="form-select shadow-sm" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value, shelterId: e.target.value === 'ADMIN' ? '' : formData.shelterId})}>
                  <option value="STAFF">เจ้าหน้าที่ประจำศูนย์ (Staff)</option>
                  <option value="ADMIN">ผู้อำนวยการส่วนกลาง (Admin)</option>
                </select>
              </div>

              {formData.role === 'STAFF' && (
                <div className="mb-3 p-3 border border-warning rounded bg-body">
                  <label className="form-label small fw-bold text-warning-emphasis">ประจำอยู่ที่ศูนย์อพยพใด? <span className="text-danger">*</span></label>
                  <select className="form-select shadow-sm" value={formData.shelterId} onChange={(e) => setFormData({...formData, shelterId: e.target.value})}>
                    <option value="">-- เลือกศูนย์อพยพ --</option>
                    {shelters.map(shelter => (<option key={shelter._id} value={shelter._id}>{shelter.name} ({shelter.district})</option>))}
                  </select>
                </div>
              )}

              <div className="mb-3">
                <label className="form-label small fw-bold">ชื่อ-นามสกุล <span className="text-danger">*</span></label>
                <input type="text" className="form-control shadow-sm" placeholder="เช่น นายสมชาย ใจดี" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold">อีเมล (ใช้สำหรับเข้าสู่ระบบ) <span className="text-danger">*</span></label>
                <input type="email" className="form-control shadow-sm" placeholder="staff@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>

              <div className="mb-4">
                <label className="form-label small fw-bold">ตั้งรหัสผ่าน <span className="text-danger">*</span></label>
                <input type="password" className="form-control shadow-sm" placeholder="********" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
              </div>

              <button type="submit" className="btn btn-primary w-100 fw-bold shadow-sm" disabled={loading}>
                {loading ? 'กำลังบันทึก...' : '✅ ยืนยันการสร้างบัญชี'}
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}