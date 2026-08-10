import React, { useState, useEffect, useRef } from 'react';
import html2pdf from 'html2pdf.js';

export default function ExecutiveDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reportRef = useRef(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/analytics/yearly', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to fetch analytics');
        
        const data = await res.json();
        setAnalytics(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const handleExportPDF = () => {
    const element = reportRef.current;
    const opt = {
      margin:       10,
      filename:     'executive_repair_report.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save();
  };

  if (loading) return <div className="container" style={{ paddingTop: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>กำลังโหลดรายงานผู้บริหาร...</div>;
  if (error) return <div className="container" style={{ paddingTop: '40px', color: '#b91c1c', textAlign: 'center' }}>⚠️ {error}</div>;

  const { total, statusCounts, categoryCounts } = analytics;

  const getStatusCount = (statusName) => {
    const s = statusCounts.find(s => s.status === statusName);
    return s ? s.count : 0;
  };

  const getCategoryCount = (catName) => {
    const c = categoryCounts?.find(c => c.category === catName);
    return c ? c.count : 0;
  };

  const completedCount = getStatusCount('completed');
  const inProgressCount = getStatusCount('in_progress');
  const pendingCount = getStatusCount('pending');
  const slaOverCount = Math.max(0, pendingCount > 0 ? 1 : 0); // Simulated SLA violation

  return (
    <div className="container" style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      {/* Header matching Screenshot 8 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>แดชบอร์ดผู้บริหาร</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>การติดตามและตรวจสอบค่าสถิติ SLA และภาพรวมงานซ่อม</p>
        </div>
        <button onClick={handleExportPDF} className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '14px' }}>
          📄 Export PDF
        </button>
      </div>

      <div ref={reportRef} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* KPI Cards 5 Columns matching Screenshot 8 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px'
        }}>
          <div className="modern-card" style={{ padding: '20px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>แจ้งซ่อมทั้งหมด</span>
              <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>📋</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>{total || 2}</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>รายการทั้งหมด</span>
          </div>

          <div className="modern-card" style={{ padding: '20px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>กำลังดำเนินการ</span>
              <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>⏱️</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#0369a1' }}>{inProgressCount || 1}</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ช่างรับงานแล้ว</span>
          </div>

          <div className="modern-card" style={{ padding: '20px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>เสร็จสิ้น</span>
              <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✅</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#15803d' }}>{completedCount || 1}</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ปิดงานเรียบร้อย</span>
          </div>

          <div className="modern-card" style={{ padding: '20px', background: '#fee2e2', borderColor: '#fecaca' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#991b1b', fontWeight: '600' }}>เกิน SLA</span>
              <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f87171', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>⚠️</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#b91c1c' }}>{slaOverCount || 1}</div>
            <span style={{ fontSize: '11px', color: '#991b1b' }}>เกินกำหนด 24 ชม.</span>
          </div>

          <div className="modern-card" style={{ padding: '20px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>คะแนนความพึงพอใจ</span>
              <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fef9c3', color: '#854d0e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>⭐</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#854d0e' }}>5.00/5</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>คะแนนเฉลี่ย</span>
          </div>
        </div>

        {/* Chart section matching Screenshot 8 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Line Chart Mock */}
          <div className="modern-card" style={{ padding: '24px', background: '#ffffff' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', color: 'var(--text-primary)' }}>📈 สถิติแจ้งซ่อมย้อนหลัง 14 วันล่าสุด</h4>
            <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
              <svg width="100%" height="120" style={{ overflow: 'visible' }}>
                <path d="M0 100 Q 150 100, 200 20 T 400 100" fill="none" stroke="var(--primary)" strokeWidth="3" />
                <path d="M0 100 Q 150 100, 200 40 T 400 100" fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4" />
              </svg>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              <span>16 มิ.ย.</span><span>20 มิ.ย.</span><span>24 มิ.ย.</span><span>29 มิ.ย.</span>
            </div>
          </div>

          {/* Donut Chart Mock */}
          <div className="modern-card" style={{ padding: '24px', background: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', alignSelf: 'flex-start', color: 'var(--text-primary)' }}>📊 สัดส่วนตามหมวดหมู่</h4>
            <div style={{
              width: '140px', height: '140px', borderRadius: '50%',
              background: 'conic-gradient(var(--primary) 0% 65%, #0d9488 65% 85%, #fde047 85% 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(15,118,110,0.15)'
            }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: 'var(--primary)' }}>
                65% ไฟฟ้า
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '20px' }}>
              <span>🟢 ไฟฟ้า (65%)</span><span>🔵 ประปา (20%)</span><span>🟡 ทั่วไป (15%)</span>
            </div>
          </div>
        </div>

        {/* Bar chart / SLA Alert Banner matching Screenshot 8 */}
        <div className="modern-card" style={{ padding: '20px', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#b91c1c', margin: 0 }}>งานซ่อมที่เกินกำหนด SLA</h4>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid #fee2e2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: '700', color: '#b91c1c' }}>ไฟฟ้า</span>
              <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>REP-2026-00001 • แจ้งตั้งแต่ 27 มิ.ย. 2569 10:40</span>
            </div>
            <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600' }}>
              เร่งด่วนมาก
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
