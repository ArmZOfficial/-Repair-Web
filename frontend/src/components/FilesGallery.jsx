import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';

export default function FilesGallery() {
  const { user } = useAuth();
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'repair', 'chat'

  useEffect(() => {
    const fetchRepairs = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/repairs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRepairs(data);
        }
      } catch (err) {
        console.error('Error fetching repairs for files:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchRepairs();
  }, [user]);

  // Extract all files/images from repairs
  const files = [];
  repairs.forEach(r => {
    if (r.imageUrl) {
      files.push({
        id: r.id,
        type: 'repair',
        url: r.imageUrl,
        title: r.title,
        category: r.category,
        date: r.createdAt,
        code: `REP-${new Date(r.createdAt).getFullYear()}-${String(r.id).padStart(5, '0')}`
      });
    }
  });

  const filteredFiles = files.filter(f => {
    const matchesTab = activeTab === 'all' || f.type === activeTab;
    const matchesSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('th-TH', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="container" style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      {/* Header matching Screenshot 4 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          background: 'var(--primary-light)',
          color: 'var(--primary)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px'
        }}>
          📁
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>ไฟล์แนบ</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>รวมรูปภาพและเอกสารจากในงานทั้งหมดของคุณ</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <span className="search-bar-icon">🔍</span>
        <input
          type="text"
          placeholder="ค้นหาเลขที่หรือหัวเรื่องในงาน..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Pill Tabs */}
      <div className="pill-tabs" style={{ maxWidth: '400px' }}>
        <button
          className={`pill-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          ทั้งหมด
        </button>
        <button
          className={`pill-tab ${activeTab === 'repair' ? 'active' : ''}`}
          onClick={() => setActiveTab('repair')}
        >
          รูปแจ้งซ่อม
        </button>
        <button
          className={`pill-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          ไฟล์แชท
        </button>
      </div>

      {/* Grid of Files matching Screenshot 4 */}
      {loading ? (
        <div className="text-center" style={{ padding: '40px', color: 'var(--text-secondary)' }}>กำลังโหลดข้อมูลไฟล์...</div>
      ) : filteredFiles.length === 0 ? (
        <div className="empty-state modern-card">
          <div className="empty-state-icon">📁</div>
          <p>ไม่พบไฟล์แนบที่ตรงกับการค้นหา</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px'
        }}>
          {filteredFiles.map((file, index) => (
            <div key={index} className="modern-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                width: '100%',
                height: '160px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: '#f1f5f9',
                position: 'relative'
              }}>
                <img
                  src={file.url}
                  alt={file.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/300x200?text=No+Image'; }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📄 {file.code}</span>
                <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>{file.title}</h4>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatDate(file.date)}</span>
              </div>

              <a
                href={`#repair-${file.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = user.role === 'admin' ? '/admin' : user.role === 'technician' ? '/technician' : '/resident';
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '13px',
                  color: 'var(--primary)',
                  fontWeight: '600',
                  textDecoration: 'none',
                  padding: '4px 4px'
                }}
              >
                เปิดในงาน ↗
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
