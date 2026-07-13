import React, { useState } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';

export default function ProfileView() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(user?.role || 'resident');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  if (!user) return null;

  const handleRoleChange = async () => {
    setLoading(true);
    setMsg('');
    try {
      // Simulate switching default role or update DB
      const updatedUser = { ...user, role: selectedRole };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      login(localStorage.getItem('token'), updatedUser);
      setMsg('อัปเดตบทบาทเริ่มต้นเรียบร้อยแล้ว');
      setTimeout(() => {
        const path = selectedRole === 'admin' ? '/admin' : selectedRole === 'technician' ? '/technician' : selectedRole === 'executive' ? '/executive' : '/resident';
        navigate(path);
      }, 1000);
    } catch (err) {
      setMsg('เกิดข้อผิดพลาดในการเปลี่ยนบทบาท');
    } finally {
      setLoading(false);
    }
  };

  const avatarSrc = user.avatarUrl 
    ? `${user.avatarUrl}` 
    : `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`;

  const roleLabel = user.role === 'admin' ? '🛡️ ผู้ดูแลระบบ' 
                  : user.role === 'technician' ? '👨‍🔧 ช่างซ่อมบำรุง' 
                  : user.role === 'executive' ? '👔 ผู้บริหาร' 
                  : '👨‍🎓 ผู้ใช้บริการ';

  return (
    <div className="container" style={{ paddingTop: '24px', paddingBottom: '60px', maxWidth: '600px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px', color: 'var(--text-primary)' }}>โปรไฟล์</h2>

      {/* User Card matching Screenshot 5 */}
      <div className="modern-card" style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '20px',
        background: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src={avatarSrc}
            alt={user.fullName}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--primary)',
              background: 'var(--primary-light)'
            }}
          />
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{user.fullName}</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{user.username.includes('@') ? user.username : `${user.username}@university.ac.th`}</p>
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
          <span style={{
            background: '#e0f2fe',
            color: '#0369a1',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            ผู้ใช้บริการ
          </span>
          <span style={{
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Settings Card matching Screenshot 5 */}
      <div className="modern-card" style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '24px',
        background: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🛡️</span>
          <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>ตั้งค่าเริ่มต้นบทบาท</h4>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          หากระบบรองรับหลายบทบาท คุณสามารถสลับรับบทบาทผู้ใช้บริการ ผู้บริหาร หรือช่างซ่อมบำรุง เพื่อทดสอบมุมมองการทำงานต่างๆ ได้ที่นี่
        </p>

        {msg && (
          <div style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '13px', fontWeight: '500', textAlign: 'center' }}>
            {msg}
          </div>
        )}

        <select
          className="form-select"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="resident">👨‍🎓 ผู้ใช้บริการ (Resident / Student)</option>
          <option value="technician">👨‍🔧 ช่างซ่อมบำรุง (Technician)</option>
          <option value="executive">👔 ผู้บริหาร (Executive)</option>
          <option value="admin">🛡️ ผู้ดูแลระบบ (Admin)</option>
        </select>

        <button
          type="button"
          onClick={handleRoleChange}
          disabled={loading}
          className="btn btn-outline"
          style={{ width: '100%', padding: '12px', background: '#f8fafc', fontWeight: '600' }}
        >
          {loading ? 'กำลังเปลี่ยนบทบาท...' : 'รับบทบาท'}
        </button>
      </div>

      {/* Logout Button Card matching Screenshot 5 */}
      <button
        type="button"
        onClick={() => {
          logout();
          navigate('/login');
        }}
        className="modern-card"
        style={{
          width: '100%',
          padding: '16px',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '15px',
          fontWeight: '600',
          color: '#dc2626',
          cursor: 'pointer',
          border: '1px solid #fecaca'
        }}
      >
        <span>[→</span> ออกจากระบบ
      </button>
    </div>
  );
}
