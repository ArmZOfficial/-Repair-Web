import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function Welcome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleStart = () => {
    if (user) {
      const getDashboardPath = (r) => {
        if (r === 'admin') return '/admin';
        if (r === 'technician') return '/technician';
        if (r === 'executive') return '/executive';
        return '/resident';
      };
      navigate(getDashboardPath(user.role));
    } else {
      navigate('/login');
    }
  };

  const features = [
    { icon: '⚡', title: 'ไฟฟ้า', desc: 'แจ้งซ่อมระบบไฟฟ้า หลอดไฟ ปลั๊ก' },
    { icon: '💧', title: 'ประปา', desc: 'ก๊อกน้ำรั่ว ท่อตัน ห้องน้ำชำรุด' },
    { icon: '🔨', title: 'งานทั่วไป', desc: 'เฟอร์นิเจอร์ ประตู หน้าต่าง โครงสร้าง' },
    { icon: '💬', title: 'แชทเรียลไทม์', desc: 'พูดคุยสื่อสารกับช่างผู้รับผิดชอบโดยตรง' },
    { icon: '📊', title: 'แดชบอร์ด KPI', desc: 'สรุปสถิติและระยะเวลาซ่อมสำหรับผู้บริหาร' },
    { icon: '🔧', title: 'ติดตามสถานะ', desc: 'อัปเดตสถานะงานซ่อมแบบเรียลไทม์ 24 ชม.' },
  ];

  return (
    <div style={{
      minHeight: 'calc(100vh - 70px)',
      display: 'flex',
      alignItems: 'center',
      padding: '40px 0',
      background: 'var(--bg-main)'
    }}>
      <div className="container" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '48px',
        alignItems: 'center'
      }}>
        {/* Left Hero Section matching Screenshot 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{
            background: '#fef9c3',
            color: '#854d0e',
            padding: '6px 16px',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '20px',
            border: '1px solid #fde047'
          }}>
            University Smart Repair
          </div>

          <h1 style={{
            fontSize: '44px',
            fontWeight: '800',
            lineHeight: '1.2',
            color: '#0f172a',
            marginBottom: '20px',
            letterSpacing: '-0.5px'
          }}>
            แจ้งซ่อมง่าย ติดตามได้ <span style={{ color: 'var(--primary)' }}>ทุกที่ ทุกเวลา</span>
          </h1>

          <p style={{
            fontSize: '16px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            marginBottom: '32px',
            maxWidth: '500px'
          }}>
            ระบบแจ้งซ่อมภายในมหาวิทยาลัยสำหรับนักศึกษา อาจารย์ และบุคลากร พร้อมแชทกับช่างแบบเรียลไทม์ และแดชบอร์ดสำหรับผู้บริหาร
          </p>

          <button
            onClick={handleStart}
            className="btn btn-primary"
            style={{
              padding: '14px 32px',
              fontSize: '16px',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 14px rgba(15, 118, 110, 0.25)'
            }}
          >
            เริ่มแจ้งซ่อม
          </button>
        </div>

        {/* Right Feature Grid matching Screenshot 1 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px'
        }}>
          {features.map((item, index) => (
            <div
              key={index}
              onClick={handleStart}
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(15,118,110,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
              }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px'
              }}>
                {item.icon}
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
