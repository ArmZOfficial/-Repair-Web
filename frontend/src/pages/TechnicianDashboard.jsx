import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import CalendarWidget from '../components/CalendarWidget';

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const [repairs, setRepairs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'claimed', 'in_progress', 'completed'
  const [showCalendar, setShowCalendar] = useState(false);

  // New Schedule Form
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleStartTime, setScheduleStartTime] = useState('');
  const [scheduleEndTime, setScheduleEndTime] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Claim Repair Modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimRepair, setClaimRepair] = useState(null);
  const [claimScheduleDate, setClaimScheduleDate] = useState('');
  const [claimScheduleStartTime, setClaimScheduleStartTime] = useState('');
  const [claimScheduleEndTime, setClaimScheduleEndTime] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [repairsRes, schedulesRes] = await Promise.all([
        fetch('/api/repairs', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/technicians/schedule', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (!repairsRes.ok || !schedulesRes.ok) throw new Error('Failed to fetch data');

      const repairsData = await repairsRes.json();
      const schedulesData = await schedulesRes.json();

      setRepairs(repairsData);
      setSchedules(schedulesData.filter(s => s.technicianId === user.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSchedule = async (e) => {
    e.preventDefault();
    setBookingLoading(true);
    try {
      const token = localStorage.getItem('token');
      const startDateTime = `${scheduleDate}T${scheduleStartTime}:00`;
      const endDateTime = `${scheduleDate}T${scheduleEndTime}:00`;

      const res = await fetch('/api/technicians/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: scheduleTitle,
          startTime: startDateTime,
          endTime: endDateTime
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to book schedule');
      }

      setScheduleTitle('');
      setScheduleDate('');
      setScheduleStartTime('');
      setScheduleEndTime('');
      fetchData();
      alert('ลงเวลาในปฏิทินเรียบร้อยแล้ว');
    } catch (err) {
      alert(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const updateRepairStatus = async (id, status, extraData = {}) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/repairs/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, ...extraData })
      });

      if (response.ok) {
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'ไม่สามารถอัปเดตสถานะได้');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const openClaimModal = (repair) => {
    setClaimRepair(repair);
    const now = new Date();
    const isoDate = now.toISOString().split('T')[0];
    const startHr = String(now.getHours() + 1).padStart(2, '0');
    const endHr = String(now.getHours() + 2).padStart(2, '0');
    setClaimScheduleDate(isoDate);
    setClaimScheduleStartTime(`${startHr}:00`);
    setClaimScheduleEndTime(`${endHr}:00`);
    setShowClaimModal(true);
  };

  const handleConfirmClaim = async (e) => {
    e.preventDefault();
    if (!claimRepair) return;
    try {
      const token = localStorage.getItem('token');
      const startDateTime = `${claimScheduleDate}T${claimScheduleStartTime}:00`;
      const endDateTime = `${claimScheduleDate}T${claimScheduleEndTime}:00`;

      // 1. Claim status
      await fetch(`/api/repairs/${claimRepair.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'in_progress', technicianId: user.id })
      });

      // 2. Book schedule
      await fetch('/api/technicians/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          repairId: claimRepair.id,
          title: `ซ่อม: ${claimRepair.title}`,
          startTime: startDateTime,
          endTime: endDateTime
        })
      });

      setShowClaimModal(false);
      fetchData();
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  const filteredRepairs = repairs.filter(r => {
    if (activeTab === 'pending') return r.status === 'pending';
    if (activeTab === 'claimed' || activeTab === 'in_progress') return r.status === 'in_progress' && (r.technicianId === user.id || !r.technicianId);
    if (activeTab === 'completed') return r.status === 'completed' && r.technicianId === user.id;
    return true;
  });

  const deptName = user.fullName.includes('ไฟฟ้า') ? 'ฝ่ายไฟฟ้า' : user.fullName.includes('ประปา') ? 'ฝ่ายประปา' : 'ฝ่ายซ่อมบำรุงทั่วไป';

  return (
    <div className="container" style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      {/* Teal Banner matching Screenshot 2 */}
      <div className="teal-banner" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2>สวัสดี 👋 {user.fullName}</h2>
            <p style={{ margin: 0 }}>ดูคิวงงานที่ได้รับมอบหมายและเริ่มทำงานได้เลย</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="btn btn-white"
              style={{ fontSize: '13px' }}
            >
              📅 {showCalendar ? 'ซ่อนปฏิทิน' : 'ดูปฏิทินช่าง'}
            </button>
            <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '13px' }}>
              📋 คิวงงาน
            </button>
          </div>
        </div>
      </div>

      {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>⚠️ {error}</div>}

      {/* Calendar Section if toggled */}
      {showCalendar && (
        <div className="modern-card" style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>📅 ตารางงานของฉัน</h3>
          <CalendarWidget schedules={schedules} />
          
          <form onSubmit={handleBookSchedule} style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>⏱️ ลงเวลาว่าง / นัดหมายส่วนตัว</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <input type="text" className="form-input" placeholder="หัวเรื่องนัดหมาย" value={scheduleTitle} onChange={(e) => setScheduleTitle(e.target.value)} required />
              <input type="date" className="form-input" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} required />
              <input type="time" className="form-input" value={scheduleStartTime} onChange={(e) => setScheduleStartTime(e.target.value)} required />
              <input type="time" className="form-input" value={scheduleEndTime} onChange={(e) => setScheduleEndTime(e.target.value)} required />
              <button type="submit" disabled={bookingLoading} className="btn btn-primary">บันทึกเวลา</button>
            </div>
          </form>
        </div>
      )}

      {/* Queue Header matching Screenshot 6 */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>คิวงงาน</h3>
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{deptName}</span>
      </div>

      {/* Pill Filter Tabs matching Screenshot 6 */}
      <div className="pill-tabs" style={{ maxWidth: '500px' }}>
        <button className={`pill-tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
          รอรับ
        </button>
        <button className={`pill-tab ${activeTab === 'claimed' || activeTab === 'in_progress' ? 'active' : ''}`} onClick={() => setActiveTab('in_progress')}>
          รับแล้ว / กำลังทำ
        </button>
        <button className={`pill-tab ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>
          เสร็จสิ้น
        </button>
      </div>

      {/* Queue Items List matching Screenshot 6 */}
      {loading ? (
        <div className="text-center" style={{ padding: '40px', color: 'var(--text-secondary)' }}>กำลังโหลดรายการแจ้งซ่อม...</div>
      ) : filteredRepairs.length === 0 ? (
        <div className="empty-state modern-card">
          <div className="empty-state-icon">📋</div>
          <p>ไม่มีงานในคิว</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredRepairs.map((repair) => (
            <div key={repair.id} className="modern-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>REP-2026-{String(repair.id).padStart(5, '0')} • {repair.category}</span>
                  <h4 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '4px 0' }}>{repair.title}</h4>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>ผู้แจ้ง: {repair.residentName || 'นักศึกษา'}</p>
                </div>
                <span className={`status-badge status-${repair.status}`}>
                  {repair.status === 'pending' ? 'รอรับเรื่อง' : repair.status === 'in_progress' ? 'รับเรื่องแล้ว / กำลังทำ' : 'เสร็จสิ้น'}
                </span>
              </div>

              <p style={{ fontSize: '15px', color: 'var(--text-primary)', background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)', margin: 0 }}>
                {repair.description}
              </p>

              {repair.imageUrl && (
                <div>
                  <img src={repair.imageUrl} alt="Repair" style={{ maxHeight: '160px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                {repair.status === 'pending' && (
                  <button onClick={() => openClaimModal(repair)} className="btn btn-primary">
                    🛠️ รับงานและลงเวลาปฏิทิน
                  </button>
                )}
                {repair.status === 'in_progress' && (
                  <button onClick={() => updateRepairStatus(repair.id, 'completed')} className="btn" style={{ background: '#15803d', color: '#fff' }}>
                    ✅ ปิดงาน (ซ่อมเสร็จสิ้น)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Claim Modal */}
      {showClaimModal && claimRepair && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px'
        }}>
          <div className="modern-card" style={{ width: '100%', maxWidth: '440px', background: '#ffffff', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>📅 กำหนดวันเวลาเข้าซ่อม</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>งาน: {claimRepair.title}</p>

            <form onSubmit={handleConfirmClaim}>
              <div className="form-group">
                <label>วันที่เข้าซ่อม</label>
                <input type="date" className="form-input" value={claimScheduleDate} onChange={(e) => setClaimScheduleDate(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>เวลาเริ่ม</label>
                  <input type="time" className="form-input" value={claimScheduleStartTime} onChange={(e) => setClaimScheduleStartTime(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>เวลาสิ้นสุด</label>
                  <input type="time" className="form-input" value={claimScheduleEndTime} onChange={(e) => setClaimScheduleEndTime(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowClaimModal(false)} className="btn btn-outline">ยกเลิก</button>
                <button type="submit" className="btn btn-primary">ยืนยันรับงาน</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
