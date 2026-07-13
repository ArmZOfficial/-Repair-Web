import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import CalendarWidget from '../components/CalendarWidget';

export default function AdminDashboard() {
const { user } = useAuth();

// Data States
const [repairs, setRepairs] = useState([]);
const [filteredRepairs, setFilteredRepairs] = useState([]);
const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 });
const [technicians, setTechnicians] = useState([]);
const [schedules, setSchedules] = useState([]);
const [loading, setLoading] = useState(true);

// Filter States
const [statusFilter, setStatusFilter] = useState('all');
const [categoryFilter, setCategoryFilter] = useState('all');
const [searchRoom, setSearchRoom] = useState('');

// Update Modal States
const [selectedRepair, setSelectedRepair] = useState(null);
const [updateStatus, setUpdateStatus] = useState('');
const [adminNotes, setAdminNotes] = useState('');
const [selectedTechnician, setSelectedTechnician] = useState('');
const [scheduledTime, setScheduledTime] = useState('');
const [modalLoading, setModalLoading] = useState(false);

// Custom Widget States
const [announcements, setAnnouncements] = useState([
{ id: 1, title: '📢 งดทิ้งเศษอาหารลงอ่างล้างจาน', date: '10 มิ.ย. 2026', content: 'กรุณาแยกเศษอาหารลงถังขยะก่อนล้าง เพื่อป้องกันปัญหาท่อน้ำอุดตันในมหาวิทยาลัย' },
{ id: 2, title: '⚡ แจ้งซ่อมบำรุงลิฟต์โดยสารตัวที่ 1', date: '08 มิ.ย. 2026', content: 'ช่างจะเข้าทำการเช็กระยะประจำปีในวันที่ 12 มิ.ย. เวลา 10:00 - 12:00 น. ระหว่างนี้โปรดใช้ลิฟต์ตัวที่ 2 สำรอง' }
]);

const [newAnnounceTitle, setNewAnnounceTitle] = useState('');
const [newAnnounceContent, setNewAnnounceContent] = useState('');
const [showAnnounceModal, setShowAnnounceModal] = useState(false);
const [showTechContactModal, setShowTechContactModal] = useState(false);
const [selectedTechSchedule, setSelectedTechSchedule] = useState(null);
const [message, setMessage] = useState({ text: '', type: '' });
const [lightboxImage, setLightboxImage] = useState('');

useEffect(() => {
fetchDashboardData();
}, []);

useEffect(() => {
applyFilters();
}, [repairs, statusFilter, categoryFilter, searchRoom]);

const fetchDashboardData = async () => {
try {
const token = localStorage.getItem('token');
const [repairsRes, techsRes, schedulesRes] = await Promise.all([
fetch('/api/repairs', { headers: { 'Authorization': `Bearer ${token}` } }),
fetch('/api/technicians', { headers: { 'Authorization': `Bearer ${token}` } }),
fetch('/api/technicians/schedule', { headers: { 'Authorization': `Bearer ${token}` } })
]);

if (!repairsRes.ok) throw new Error('ไม่สามารถโหลดข้อมูลรายการแจ้งซ่อมได้');

const repairsData = await repairsRes.json();
setRepairs(repairsData);
calculateStats(repairsData);

if (techsRes.ok) setTechnicians(await techsRes.json());
if (schedulesRes.ok) setSchedules(await schedulesRes.json());
} catch (err) {
showMsg(err.message, 'error');
} finally {
setLoading(false);
}
};

const calculateStats = (items) => {
const total = items.length;
const pending = items.filter(i => i.status === 'pending').length;
const inProgress = items.filter(i => i.status === 'in_progress').length;
const completed = items.filter(i => i.status === 'completed').length;
setStats({ total, pending, inProgress, completed });
};

const applyFilters = () => {
let result = [...repairs];

// Status Filter
if (statusFilter !== 'all') {
result = result.filter(item => item.status === statusFilter);
}

// Category Filter
if (categoryFilter !== 'all') {
result = result.filter(item => item.category === categoryFilter);
}

// Room Search
if (searchRoom.trim() !== '') {
result = result.filter(item => 
item.roomNumber.toLowerCase().includes(searchRoom.toLowerCase())
);
}

setFilteredRepairs(result);
};

const showMsg = (text, type = 'success') => {
setMessage({ text, type });
setTimeout(() => setMessage({ text: '', type: '' }), 5000);
};

const fetchRepairs = async () => {
try {
const token = localStorage.getItem('token');
const res = await fetch('/api/repairs', { headers: { 'Authorization': `Bearer ${token}` } });
if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลรายการแจ้งซ่อมได้');
const data = await res.json();
setRepairs(data);
calculateStats(data);
} catch (err) {
showMsg(err.message, 'error');
}
};

const openUpdateModal = (repair) => {
setSelectedRepair(repair);
setUpdateStatus(repair.status);
setAdminNotes(repair.adminNotes || '');
};

const closeUpdateModal = () => {
setSelectedRepair(null);
};

const handleUpdateStatus = async (e) => {
e.preventDefault();
if (!selectedRepair) return;

setModalLoading(true);
try {
const token = localStorage.getItem('token');
const response = await fetch(`/api/repairs/${selectedRepair.id}/status`, {
method: 'PUT',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${token}`
},
body: JSON.stringify({
status: updateStatus,
adminNotes: adminNotes
})
});

const data = await response.json();

if (!response.ok) {
throw new Error(data.error || 'ปรับปรุงสถานะไม่สำเร็จ');
}

showMsg(`✅ อัปเดตสถานะรายการ #${selectedRepair.id} สำเร็จแล้ว`);
fetchRepairs();
closeUpdateModal();
} catch (err) {
showMsg(err.message, 'error');
} finally {
setModalLoading(false);
}
};

const handleAddAnnouncement = (e) => {
e.preventDefault();
if (!newAnnounceTitle || !newAnnounceContent) return;

const newAnn = {
id: Date.now(),
title: `📢 ${newAnnounceTitle}`,
date: 'วันนี้',
content: newAnnounceContent
};

setAnnouncements([newAnn, ...announcements]);
setNewAnnounceTitle('');
setNewAnnounceContent('');
setShowAnnounceModal(false);
showMsg('📢 โพสต์ประกาศหอพักอันใหม่สำเร็จแล้ว!');
};

const handlePrintReport = () => {
window.print();
};

const handleClearAllRepairs = async () => {
if (!window.confirm('⚠️ คำเตือน: คุณแน่ใจหรือไม่ว่าต้องการลบประวัติรายการแจ้งซ่อมทั้งหมดออกจากระบบ? การดำเนินการนี้ไม่สามารถย้อนกลับได้!')) {
return;
}

try {
const token = localStorage.getItem('token');
const response = await fetch('/api/repairs', {
method: 'DELETE',
headers: {
'Authorization': `Bearer ${token}`
}
});

const data = await response.json();
if (!response.ok) {
throw new Error(data.error || 'ไม่สามารถล้างรายการแจ้งซ่อมได้');
}

showMsg('🗑️ ล้างรายการแจ้งซ่อมทั้งหมดสำเร็จเรียบร้อยแล้ว');
fetchRepairs();
} catch (err) {
showMsg(err.message, 'error');
}
};

const handleDeleteRepair = async (id) => {
if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรายการแจ้งซ่อม #${id} ออกจากระบบ?`)) {
return;
}

try {
const token = localStorage.getItem('token');
const response = await fetch(`/api/repairs/${id}`, {
method: 'DELETE',
headers: {
'Authorization': `Bearer ${token}`
}
});

const data = await response.json();
if (!response.ok) {
throw new Error(data.error || 'ไม่สามารถลบรายการแจ้งซ่อมนี้ได้');
}

showMsg(`🗑️ ลบรายการแจ้งซ่อม #${id} สำเร็จเรียบร้อยแล้ว`);
fetchRepairs();
} catch (err) {
showMsg(err.message, 'error');
}
};

// Get breakdown stats by category for simple analytics
const getCategoryAnalytics = () => {
const counts = { plumbing: 0, electrical: 0, furniture: 0, appliance: 0, structural: 0, other: 0 };
repairs.forEach(item => {
if (counts[item.category] !== undefined) {
counts[item.category]++;
} else {
counts.other++;
}
});

const maxCount = Math.max(...Object.values(counts), 1);
return Object.entries(counts).map(([cat, val]) => ({
key: cat,
label: getCategoryText(cat),
count: val,
percentage: (val / maxCount) * 100
}));
};

const getCategoryText = (cat) => {
const mapping = {
plumbing: 'ระบบประปา',
electrical: 'ระบบไฟฟ้า',
furniture: 'เฟอร์นิเจอร์',
appliance: 'เครื่องใช้ไฟฟ้า',
structural: 'โครงสร้างห้อง',
other: 'อื่นๆ'
};
return mapping[cat] || cat;
};

const getStatusText = (status) => {
const mapping = {
pending: 'รอรับเรื่อง',
in_progress: 'กำลังดำเนินการ',
completed: 'เสร็จสิ้น',
cancelled: 'ยกเลิก'
};
return mapping[status] || status;
};

// Calculate closure rate percentage
const getClosureRate = () => {
if (stats.total === 0) return 0;
return Math.round((stats.completed / stats.total) * 100);
};

return (
<div className="container" style={{ paddingTop: '32px' }}>
{/* Admin Header with Actions */}
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }}>
<div>
<h2 style={{ fontSize: '26px', fontWeight: '700' }}>แดชบอร์ดผู้ดูแลมหาวิทยาลัย (Admin Console)</h2>
<p style={{ color: 'var(--text-secondary)' }}>ตรวจสอบ ติดตามสถานะงานซ่อมแซม และบริหารจัดการสิ่งอำนวยความสะดวกทั้งหมดในมหาวิทยาลัย</p>
</div>

{/* Quick Tools Panel */}
<div style={{ display: 'flex', gap: '12px' }}>
<button onClick={() => setShowAnnounceModal(true)} className="btn btn-accent" style={{ padding: '10px 18px', fontSize: '14px' }}>
📢 เขียนประกาศใหม่
</button>
<button onClick={handlePrintReport} className="btn btn-outline" style={{ padding: '10px 18px', fontSize: '14px' }}>
🖨️ พิมพ์รายงานสรุป
</button>
<button onClick={handleClearAllRepairs} className="btn btn-danger" style={{ padding: '10px 18px', fontSize: '14px' }}>
🗑️ ล้างรายการทั้งหมด
</button>
</div>
</div>

{message.text && (
<div style={{
background: message.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
color: message.type === 'error' ? '#f87171' : '#34d399',
padding: '16px',
borderRadius: '8px',
marginBottom: '24px',
border: message.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
}}>
{message.text}
</div>
)}

{/* KPI Stats Widgets */}
<div className="summary-cards" style={{ marginBottom: '32px', marginTop: '0' }}>
<div className="glass-card summary-card">
<div className="summary-card-info">
<h3>รับแจ้งทั้งหมด</h3>
<p>{stats.total}</p>
</div>
<div className="summary-card-icon">📁</div>
</div>
<div className="glass-card summary-card" style={{ borderColor: 'rgba(245, 158, 11, 0.2)' }}>
<div className="summary-card-info">
<h3>รอรับเรื่อง (Pending)</h3>
<p style={{ color: 'var(--status-pending-color)' }}>{stats.pending}</p>
</div>
<div className="summary-card-icon" style={{ color: 'var(--status-pending-color)' }}>⏳</div>
</div>
<div className="glass-card summary-card" style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
<div className="summary-card-info">
<h3>กำลังดำเนินการ</h3>
<p style={{ color: 'var(--status-inprogress-color)' }}>{stats.inProgress}</p>
</div>
<div className="summary-card-icon" style={{ color: 'var(--status-inprogress-color)' }}>🛠️</div>
</div>

{/* Closure Rate circular bar mock */}
<div className="glass-card summary-card" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
<div className="summary-card-info">
<h3>อัตราปิดงานสำเร็จ</h3>
<p style={{ color: 'var(--status-completed-color)' }}>{getClosureRate()}%</p>
</div>
<div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
<svg style={{ transform: 'rotate(-90deg)', width: '56px', height: '56px' }}>
<circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="transparent" />
<circle cx="28" cy="28" r="22" stroke="var(--status-completed-color)" strokeWidth="4" fill="transparent" 
strokeDasharray="138"
strokeDashoffset={138 - (138 * getClosureRate()) / 100}
strokeLinecap="round"
style={{ transition: 'stroke-dashoffset 0.5s ease' }}
/>
</svg>
<span style={{ position: 'absolute', fontSize: '11px', fontWeight: 'bold', color: 'var(--status-completed-color)' }}>
{stats.completed}/{stats.total}
</span>
</div>
</div>
</div>

{/* Main Grid: Left List / Right Multi-Widgets */}
<div className="dashboard-grid admin-grid" style={{ gridTemplateColumns: '7fr 3fr' }}>
{/* Left Column: Repairs List & Search */}
<div>
<div className="glass-card">
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
<h3 style={{ fontSize: '20px', fontWeight: '600' }}>รายการส่งซ่อมบำรุง</h3>
<button 
onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); setSearchRoom(''); }}
className="btn btn-outline"
style={{ padding: '6px 12px', fontSize: '13px' }}
>
ล้างตัวกรอง
</button>
</div>

{/* Filters Bar */}
<div className="filters-bar">
<div style={{ flex: 1, minWidth: '180px' }}>
<input 
type="text" 
className="form-input" 
placeholder="🔍 ค้นหาตามเลขห้องพัก..." 
value={searchRoom}
onChange={(e) => setSearchRoom(e.target.value)}
style={{ width: '100%' }}
/>
</div>

<div style={{ width: '160px' }}>
<select 
className="form-select" 
value={statusFilter}
onChange={(e) => setStatusFilter(e.target.value)}
style={{ width: '100%' }}
>
<option value="all">ทุกสถานะ</option>
<option value="pending">รอรับเรื่อง</option>
<option value="in_progress">กำลังดำเนินการ</option>
<option value="completed">เสร็จสิ้น</option>
<option value="cancelled">ยกเลิก</option>
</select>
</div>

<div style={{ width: '180px' }}>
<select 
className="form-select" 
value={categoryFilter}
onChange={(e) => setCategoryFilter(e.target.value)}
style={{ width: '100%' }}
>
<option value="all">ทุกหมวดหมู่</option>
<option value="plumbing">💦 ระบบประปา</option>
<option value="electrical">⚡ ระบบไฟฟ้า</option>
<option value="furniture">🪑 เฟอร์นิเจอร์</option>
<option value="appliance">🔌 เครื่องใช้ไฟฟ้า</option>
<option value="structural">🧱 โครงสร้างห้อง</option>
<option value="other">📦 อื่นๆ</option>
</select>
</div>
</div>

{/* List */}
{loading ? (
<div className="text-center" style={{ padding: '48px 0', color: 'var(--text-secondary)' }}>
กำลังดาวน์โหลดข้อมูลงานแจ้งซ่อม...
</div>
) : filteredRepairs.length === 0 ? (
<div className="empty-state">
<div className="empty-state-icon">🔍</div>
<p>ไม่พบรายการแจ้งซ่อมที่ตรงกับตัวกรอง</p>
<p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ลองเปลี่ยนคำค้นหาหรือตัวกรองด้านบน</p>
</div>
) : (
<div className="repairs-list">
{filteredRepairs.map((item) => (
<div key={item.id} className="glass-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
<div className="repair-item">
{item.imageUrl && (
<img 
src={`http://localhost:5000${item.imageUrl}`} 
alt="Reported problem" 
className="repair-item-img"
style={{ cursor: 'zoom-in' }}
onClick={() => setLightboxImage(`http://localhost:5000${item.imageUrl}`)}
/>
)}

<div className="repair-item-content">
<div>
<div className="repair-item-header">
<div>
<span className="repair-item-title" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
#{item.id} - {item.title}
<span style={{
fontSize: '12px', 
padding: '2px 8px', 
background: 'rgba(99,102,241,0.15)',
color: 'var(--primary)',
borderRadius: '4px',
fontWeight: '500'
}}>
ห้อง {item.roomNumber}
</span>
</span>
</div>
<span className={`status-badge status-${item.status.replace('_', '')}`}>
{getStatusText(item.status)}
</span>
</div>

<div className="repair-item-meta">
<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
ผู้แจ้ง: 
<img 
src={item.residentAvatarUrl 
? `http://localhost:5000${item.residentAvatarUrl}` 
: `https://api.dicebear.com/7.x/bottts/svg?seed=${item.residentName}`} 
alt="Resident Avatar"
style={{ 
width: '20px', 
height: '20px', 
borderRadius: '50%', 
objectFit: 'cover',
border: '1px solid rgba(255,255,255,0.15)',
background: 'rgba(255,255,255,0.05)'
}}
/>
<strong>{item.residentName}</strong>
</span>
<span>•</span>
<span>หมวดหมู่: {getCategoryText(item.category)}</span>
<span>•</span>
<span>วันที่ส่ง: {new Date(item.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
{item.detectedObject && (
<>
<span>•</span>
<span style={{ color: '#34d399' }}>🤖 AI: {item.detectedObject}</span>
</>
)}
</div>
<p className="repair-item-desc">{item.description}</p>
</div>

{item.adminNotes && (
<div className="repair-item-notes" style={{ marginBottom: '12px' }}>
<strong>🛠️ บันทึกการอัปเดต:</strong> {item.adminNotes}
</div>
)}

<div style={{ display: 'flex', gap: '8px' }}>
<button 
onClick={() => openUpdateModal(item)}
className="btn btn-outline"
style={{ padding: '8px 16px', fontSize: '13px' }}
>
⚙️ จัดการ/อัปเดตสถานะ
</button>
<button 
onClick={() => handleDeleteRepair(item.id)}
className="btn btn-danger"
style={{ padding: '8px 16px', fontSize: '13px' }}
>
🗑️ ลบรายการนี้
</button>
</div>
</div>
</div>
</div>
))}
</div>
)}
</div>
</div>

{/* Right Column: Multi-Widgets & Analytics */}
<div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

{/* Widget 1: Category Analytics CSS Bar Chart */}
<div className="glass-card">
<h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>
📊 สถิติซ่อมแยกตามหมวดหมู่
</h3>
<div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
{getCategoryAnalytics().map((cat) => (
<div key={cat.key}>
<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
<span>{cat.label}</span>
<span style={{ fontWeight: '600' }}>{cat.count} งาน</span>
</div>
{/* CSS bar with color gradient */}
<div style={{
width: '100%',
height: '8px',
background: 'rgba(255,255,255,0.05)',
borderRadius: '4px',
overflow: 'hidden'
}}>
<div style={{
width: `${cat.percentage}%`,
height: '100%',
background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)',
borderRadius: '4px',
transition: 'width 0.5s ease-in-out'
}} />
</div>
</div>
))}
</div>
</div>

{/* Widget 2: Handymen & Techs Availability */}
<div className="glass-card">
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
<h3 style={{ fontSize: '16px', fontWeight: '600' }}>
🔧 ตารางสถานะช่างซ่อม
</h3>
<button 
onClick={() => setShowTechContactModal(true)} 
className="btn btn-outline" 
style={{ padding: '4px 8px', fontSize: '11px' }}
>
เบอร์ติดต่อด่วน
</button>
</div>

<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
{technicians.map((tech) => {
const now = new Date();
const techSchedules = schedules.filter(s => s.technicianId === tech.id);
const currentTask = techSchedules.find(s => new Date(s.startTime) <= now && new Date(s.endTime) >= now);
const isBusy = !!currentTask;

return (
<div key={tech.id} style={{
background: 'rgba(255,255,255,0.02)',
border: '1px solid var(--border-color)',
borderRadius: '8px',
padding: '12px',
fontSize: '13px'
}}>
<div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', marginBottom: '4px' }}>
<span>{tech.fullName}</span>
<span style={{
color: !isBusy ? 'var(--status-completed-color)' : 'var(--status-pending-color)'
}}>
{!isBusy ? '🟢 ว่าง' : '🔴 ติดงาน'}
</span>
</div>
{isBusy && (
<div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
⚡ ภารกิจ: {currentTask.title}
</div>
)}
<div style={{ marginTop: '12px' }}>
<button 
onClick={() => setSelectedTechSchedule(tech)}
className="btn btn-outline"
style={{ padding: '6px 8px', fontSize: '11px', width: '100%', borderColor: 'rgba(255,255,255,0.1)' }}
>
📅 ดูตารางเวลาว่าง/ติดงาน
</button>
</div>
</div>
);
})}
</div>
</div>

{/* Widget 3: Dormitory Bulletin Board (Announcements) */}
<div className="glass-card">
<h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
📢 กระดานประกาศมหาวิทยาลัย
</h3>
<div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto' }}>
{announcements.map((ann) => (
<div key={ann.id} style={{
borderBottom: '1px solid var(--border-color)',
paddingBottom: '10px'
}}>
<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>
<span style={{ color: 'var(--text-primary)' }}>{ann.title}</span>
<span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ann.date}</span>
</div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {ann.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 4: Timeline Recent Activity Feed */}
          <div className="glass-card">
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              🕒 ประวัติกิจกรรมล่าสุด
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '250px', overflowY: 'auto' }}>
              {repairs.slice(0, 4).map((item, index) => (
                <div key={index} style={{
                  display: 'flex',
                  gap: '12px',
                  fontSize: '12px',
                  borderLeft: '2px solid var(--border-color)',
                  paddingLeft: '12px',
                  position: 'relative'
                }}>
{/* Dot indicator */}
<div style={{
position: 'absolute',
left: '-5px',
top: '2px',
width: '8px',
height: '8px',
borderRadius: '50%',
background: item.status === 'completed' ? 'var(--status-completed-color)' : 
item.status === 'in_progress' ? 'var(--status-inprogress-color)' : 
item.status === 'cancelled' ? 'var(--status-cancelled-color)' : 'var(--status-pending-color)'
}} />
<div>
<span style={{ color: 'var(--text-secondary)' }}>
<strong>{item.residentName || 'ผู้เช่า'} (ห้อง {item.roomNumber})</strong>
</span>{' '}
ส่งเรื่อง "{item.title}" และได้รับอัปเดตเป็น{' '}
<strong style={{
color: item.status === 'completed' ? 'var(--status-completed-color)' : 'var(--text-primary)'
}}>
[{getStatusText(item.status)}]
</strong>
<div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
{new Date(item.updatedAt || item.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
</div>
</div>
</div>
))}
</div>
</div>

</div>
</div>


{/* Update Status Modal */}
{selectedRepair && (
<div className="modal-backdrop" onClick={closeUpdateModal}>
<div className="glass-card modal-content" onClick={(e) => e.stopPropagation()}>
<h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
จัดการใบแจ้งซ่อม #{selectedRepair.id}
</h3>

<div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
<p>📌 <strong>หัวข้อ:</strong> {selectedRepair.title}</p>
<p>📌 <strong>สถานที่:</strong> {selectedRepair.roomNumber} ({selectedRepair.residentName})</p>
</div>

<form onSubmit={handleUpdateStatus}>
<div className="form-group">
<label htmlFor="update-status">สถานะงานซ่อม</label>
<select 
id="update-status" 
className="form-select"
value={updateStatus}
onChange={(e) => setUpdateStatus(e.target.value)}
>
<option value="pending">⏳ รอรับเรื่อง (Pending)</option>
<option value="in_progress">🛠️ กำลังดำเนินการ (In Progress)</option>
<option value="completed">✅ เสร็จสิ้น (Completed)</option>
<option value="cancelled">❌ ยกเลิก (Cancelled)</option>
</select>
</div>

<div className="form-group">
<label>มอบหมายช่างซ่อม</label>
<select className="form-select" value={selectedTechnician} onChange={e => setSelectedTechnician(e.target.value)}>
<option value="">-- ไม่ระบุช่าง --</option>
{technicians.map(t => (
<option key={t.id} value={t.id}>{t.fullName}</option>
))}
</select>
</div>

<div className="form-group">
<label>เวลานัดหมายซ่อม (พิมพ์ระบุเวลา)</label>
<input type="text" className="form-input" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} placeholder="เช่น 15 มิ.ย. 2026 10:00 น." />
</div>

<div className="form-group">
<label htmlFor="admin-notes">บันทึกเพิ่มเติมจากช่าง / ข้อความแจ้งผู้แจ้ง</label>
<textarea 
id="admin-notes"
className="form-input"
rows="3"
value={adminNotes}
onChange={(e) => setAdminNotes(e.target.value)}
placeholder="เช่น กำลังดำเนินการจัดซื้อหลอดไฟ หรือ ช่างจะเข้าไปซ่อมเวลา 14:00 น."
style={{ resize: 'vertical' }}
/>
</div>

<div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
<button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={modalLoading}>
{modalLoading ? 'กำลังอัปเดต...' : 'บันทึกการปรับปรุง'}
</button>
<button type="button" onClick={closeUpdateModal} className="btn btn-outline">
ยกเลิก
</button>
</div>
</form>
</div>
</div>
)}

{/* Add Announcement Modal */}
{showAnnounceModal && (
<div className="modal-backdrop" onClick={() => setShowAnnounceModal(false)}>
<div className="glass-card modal-content" onClick={(e) => e.stopPropagation()}>
<h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
📢 โพสต์ประกาศใหม่ของมหาวิทยาลัย
</h3>
<form onSubmit={handleAddAnnouncement}>
<div className="form-group">
<label htmlFor="announce-title">หัวข้อประกาศ</label>
<input 
type="text" 
id="announce-title" 
className="form-input"
placeholder="เช่น ประกาศปิดปรับปรุงท่อน้ำประปาส่วนกลาง"
value={newAnnounceTitle}
onChange={(e) => setNewAnnounceTitle(e.target.value)}
required
/>
</div>
<div className="form-group">
<label htmlFor="announce-content">รายละเอียดประกาศ</label>
<textarea 
id="announce-content" 
className="form-input"
rows="4"
placeholder="กรอกรายละเอียดสำหรับแจ้งให้บุคลากร/นักศึกษาทุกคนทราบ..."
value={newAnnounceContent}
onChange={(e) => setNewAnnounceContent(e.target.value)}
style={{ resize: 'vertical' }}
required
/>
</div>
<div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
<button type="submit" className="btn btn-accent" style={{ flex: 1 }}>
โพสต์ประกาศทันที
</button>
<button type="button" onClick={() => setShowAnnounceModal(false)} className="btn btn-outline">
ยกเลิก
</button>
</div>
</form>
</div>
</div>
)}

      {/* Contact Technicians Modal */}
      {showTechContactModal && (
        <div className="modal-backdrop" onClick={() => setShowTechContactModal(false)}>
          <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              📞 รายชื่อและเบอร์ติดต่อช่างด่วน
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {technicians.map((tech) => (
                <div key={tech.id} style={{
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '12px'
                }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>
                    {tech.fullName}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0' }}>
                    ความเชี่ยวชาญ: {tech.specialty || 'ทั่วไป'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '500', marginTop: '4px' }}>
                    เบอร์ติดต่อ: {tech.phone || '-'}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setShowTechContactModal(false)} className="btn btn-outline" style={{ width: '100%' }}>
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {selectedTechSchedule && (
        <div className="modal-backdrop" onClick={() => setSelectedTechSchedule(null)}>
          <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
                📅 ตารางเวลา: {selectedTechSchedule.fullName}
              </h3>
              <button type="button" className="btn btn-outline" onClick={() => setSelectedTechSchedule(null)} style={{ padding: '4px 8px', fontSize: '12px' }}>
                ปิด
              </button>
            </div>
            <CalendarWidget 
              schedules={schedules.filter(s => s.technicianId === selectedTechSchedule.id)} 
              technician={selectedTechSchedule} 
            />
          </div>
        </div>
      )}

      {lightboxImage && (
        <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage('')} />
      )}
    </div>
  );
}

// Image Lightbox Component inline
function ImageLightbox({ imageUrl, onClose }) {
  const [zoomScale, setZoomScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.5, 0.5));
  const handleReset = () => {
    setZoomScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (zoomScale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && zoomScale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div 
      className="modal-backdrop" 
      onClick={onClose}
      style={{ zIndex: 2000, background: 'rgba(15, 23, 42, 0.95)', cursor: 'zoom-out' }}
      onMouseUp={handleMouseUp}
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{
          position: 'relative',
          width: '90%',
          maxWidth: '850px',
          height: '80%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'default'
        }}
      >
        {/* Controls */}
        <div style={{
          position: 'absolute',
          top: '20px',
          background: 'rgba(30, 41, 59, 0.85)',
          backdropFilter: 'blur(12px)',
          padding: '10px 20px',
          borderRadius: '30px',
          display: 'flex',
          gap: '12px',
          zIndex: 2010,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          <button type="button" className="btn btn-outline" onClick={handleZoomIn} style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '20px' }}>➕ ซูมเข้า</button>
          <button type="button" className="btn btn-outline" onClick={handleZoomOut} style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '20px' }}>➖ ซูมออก</button>
          <button type="button" className="btn btn-outline" onClick={handleReset} style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '20px' }}>🔄 รีเซ็ต</button>
          <button type="button" className="btn btn-danger" onClick={onClose} style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '20px' }}>❌ ปิด</button>
        </div>

        {/* Zoomed Image Container */}
        <div style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '12px',
          background: 'rgba(0, 0, 0, 0.5)',
          position: 'relative',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <img 
            src={imageUrl} 
            alt="Enlarged view" 
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              maxHeight: '90%',
              maxWidth: '90%',
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoomScale})`,
              transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.1, 0.76, 0.55, 0.94)',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              objectFit: 'contain'
            }}
          />
        </div>
        
        {/* Help Tip */}
        <div style={{
          marginTop: '16px',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          textAlign: 'center',
          background: 'rgba(30, 41, 59, 0.4)',
          padding: '6px 16px',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.03)'
        }}>
          💡 คลิกเมาส์ค้างและลากเพื่อขยับเคลื่อนย้ายมุมกล้องรูปภาพเมื่อทำการซูมได้
        </div>
      </div>
    </div>
  );
}
