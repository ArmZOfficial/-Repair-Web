import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'การเข้าสู่ระบบล้มเหลว');
      }

      const getDashboardPath = (role) => {
        if (role === 'admin') return '/admin';
        if (role === 'technician') return '/technician';
        if (role === 'executive') return '/executive';
        return '/resident';
      };

      login(data.token, data.user);
      navigate(getDashboardPath(data.user.role));
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

      {/* Main Login Card matching Screenshot 7 */}
      <div className="modern-card" style={{
        width: '100%',
        maxWidth: '440px',
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
            เข้าสู่ระบบ
          </div>
          <Link to="/register" style={{
            flex: 1,
            textAlign: 'center',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            fontWeight: '500',
            color: 'var(--text-secondary)',
            textDecoration: 'none'
          }}>
            สมัครสมาชิก
          </Link>
        </div>

        {error && (
          <div style={{ 
            background: '#fee2e2', 
            color: '#b91c1c', 
            padding: '12px', 
            borderRadius: 'var(--radius-sm)', 
            fontSize: '14px', 
            marginBottom: '20px',
            textAlign: 'center',
            fontWeight: '500'
          }}>
            ⚠️ {error}
          </div>
        )}



        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">อีเมล / ชื่อผู้ใช้งาน</label>
            <input
              type="text"
              id="username"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="student@university.ac.th"
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
              placeholder="........"
              required
            />
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
              marginTop: '12px',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>


      </div>
    </div>
  );
}
