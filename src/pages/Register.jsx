import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('resident');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const removeAvatar = (e) => {
    e.stopPropagation();
    setAvatarFile(null);
    setAvatarPreview('');
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('fullName', fullName);
      formData.append('role', role);
      
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'การสมัครสมาชิกล้มเหลว');
      }

      setSuccess('สมัครสมาชิกสำเร็จแล้ว! กำลังเข้าสู่ระบบ...');
      
      setTimeout(() => {
        login(data.token, data.user);
        const getDashboardPath = (r) => {
          if (r === 'admin') return '/admin';
          if (r === 'technician') return '/technician';
          if (r === 'executive') return '/executive';
          return '/resident';
        };
        navigate(getDashboardPath(data.user.role));
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 80px)',
      padding: '40px 20px',
      background: 'var(--bg-main)'
    }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          background: 'var(--primary)',
          color: '#ffffff',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px'
        }}>
          🔧
        </div>
        <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
          ระบบแจ้งซ่อมมหาวิทยาลัย
        </span>
      </div>

      {/* Main Card matching Screenshot 7 */}
      <div className="modern-card" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '28px',
        background: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-md)'
      }}>
        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          padding: '6px',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '24px'
        }}>
          <Link to="/login" style={{
            flex: 1,
            textAlign: 'center',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            fontWeight: '500',
            color: 'var(--text-secondary)',
            textDecoration: 'none'
          }}>
            เข้าสู่ระบบ
          </Link>
          <div style={{
            flex: 1,
            textAlign: 'center',
            padding: '10px',
            background: '#ffffff',
            borderRadius: 'var(--radius-md)',
            fontWeight: '600',
            color: 'var(--text-primary)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            สมัครสมาชิก
          </div>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '14px', marginBottom: '20px', textAlign: 'center' }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{ background: '#dcfce7', color: '#15803d', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '14px', marginBottom: '20px', textAlign: 'center' }}>
            ✅ {success}
          </div>
        )}



        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName">ชื่อ-นามสกุลจริง</label>
            <input
              type="text"
              id="fullName"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="เช่น สมชาย ใจดี หรือ ช่างสมศักดิ์ (ไฟฟ้า)"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">อีเมล / ชื่อผู้ใช้งาน (Username)</label>
            <input
              type="text"
              id="username"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="เช่น student@university.ac.th"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">รหัสผ่าน</label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="กำหนดรหัสผ่านอย่างน้อย 5 ตัวอักษร"
              required
              minLength="5"
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">บทบาทเริ่มต้นในการใช้งาน</label>
            <select
              id="role"
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="resident">👨‍🎓 ผู้ใช้บริการ (นักศึกษา / อาจารย์ / บุคลากร)</option>
              <option value="technician">👨‍🔧 ช่างซ่อมบำรุง (Technician)</option>
              <option value="executive">👔 ผู้บริหาร / คณบดี (Executive)</option>
              <option value="admin">🛡️ ผู้ดูแลระบบ (Admin)</option>
            </select>
          </div>

          {/* Avatar Upload */}
          <div className="form-group">
            <label>รูปโปรไฟล์ (ไม่บังคับ)</label>
            <div
              onClick={() => avatarInputRef.current?.click()}
              style={{
                border: '1px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
              {avatarPreview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={avatarPreview} alt="Preview" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
                  <button type="button" onClick={removeAvatar} style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', cursor: 'pointer' }}>✕</button>
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>📷 คลิกเพื่ออัปโหลดรูปโปรไฟล์</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              marginTop: '12px'
            }}
          >
            {loading ? 'กำลังสร้างบัญชี...' : 'สมัครสมาชิก'}
          </button>
        </form>
      </div>
    </div>
  );
}
