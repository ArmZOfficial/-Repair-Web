import React, { useState } from 'react';

export default function CalendarWidget({ schedules, technician }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Logic to generate calendar grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);

  const grid = [];
  // previous month filler
  for (let i = firstDay - 1; i >= 0; i--) {
    grid.push({
      day: prevMonthDays - i,
      month: month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false
    });
  }
  // current month
  for (let i = 1; i <= daysInMonth; i++) {
    grid.push({
      day: i,
      month: month,
      year: year,
      isCurrentMonth: true
    });
  }
  // next month filler
  const remainingCells = 42 - grid.length;
  for (let i = 1; i <= remainingCells; i++) {
    grid.push({
      day: i,
      month: month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false
    });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Check if a day has schedules
  const getSchedulesForDate = (y, m, d) => {
    const targetDate = new Date(y, m, d);
    targetDate.setHours(0,0,0,0);
    
    return schedules.filter(s => {
      const start = new Date(s.startTime);
      const end = new Date(s.endTime);
      
      const startDay = new Date(start);
      startDay.setHours(0,0,0,0);
      
      const endDay = new Date(end);
      endDay.setHours(0,0,0,0);
      
      return targetDate >= startDay && targetDate <= endDay;
    });
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const selectedSchedules = getSchedulesForDate(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());

  // Function to format time
  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      background: '#1e2126',
      color: '#e2e8f0',
      borderRadius: '12px',
      padding: '24px',
      fontFamily: '"Inter", "Segoe UI", sans-serif',
      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
      width: '100%',
      maxWidth: '420px',
      margin: '0 auto',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0, color: '#f8fafc' }}>
          {monthNames[month]} {year}
        </h2>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={handlePrevMonth} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px', padding: '4px' }}>▲</button>
          <button onClick={handleNextMonth} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px', padding: '4px' }}>▼</button>
        </div>
      </div>

      {/* Weekdays */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '16px' }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} style={{ textAlign: 'center', fontWeight: '600', fontSize: '13px', color: '#f8fafc' }}>
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', rowGap: '12px' }}>
        {grid.map((cell, index) => {
          const isSelected = selectedDate.getDate() === cell.day && selectedDate.getMonth() === cell.month && selectedDate.getFullYear() === cell.year;
          const today = new Date();
          const isToday = today.getDate() === cell.day && today.getMonth() === cell.month && today.getFullYear() === cell.year;
          
          const daySchedules = getSchedulesForDate(cell.year, cell.month, cell.day);
          const hasSchedules = daySchedules.length > 0;

          return (
            <div 
              key={index} 
              onClick={() => setSelectedDate(new Date(cell.year, cell.month, cell.day))}
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '40px',
                width: '40px',
                margin: '0 auto',
                borderRadius: '50%',
                background: isSelected ? '#38bdf8' : 'transparent',
                color: isSelected ? '#0f172a' : cell.isCurrentMonth ? '#cbd5e1' : '#475569',
                fontWeight: isSelected ? 'bold' : 'normal',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                boxShadow: isSelected ? '0 0 10px rgba(56, 189, 248, 0.5)' : 'none'
              }}
            >
              {cell.day}
              {/* Dot indicator if not selected but has schedules */}
              {hasSchedules && !isSelected && (
                <div style={{
                  position: 'absolute',
                  bottom: '4px',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: '#ef4444' // Red dot for booked days
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Details Section */}
      <div style={{ marginTop: '28px', borderTop: '1px solid #334155', paddingTop: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '16px' }}>
          รายละเอียดวันที่ {selectedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
        </h3>
        
        {selectedSchedules.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(52, 211, 153, 0.05)', borderLeft: '4px solid #34d399', borderRadius: '6px', color: '#a7f3d0' }}>
            <span style={{ fontSize: '20px' }}>🟢</span>
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>วันนี้ช่างว่าง</div>
              <div style={{ fontSize: '13px', color: '#6ee7b7', marginTop: '4px' }}>สามารถลงคิวงานซ่อมได้เลย</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '180px', overflowY: 'auto', paddingRight: '8px' }}>
            {selectedSchedules.map(s => {
              const isCompleted = s.repairStatus === 'completed';
              const isInProgress = s.repairStatus === 'in_progress';
              const isPending = s.repairStatus === 'pending';
              const isCancelled = s.repairStatus === 'cancelled';
              
              let statusText = '';
              let statusColor = '#ef4444'; // default red
              let icon = '🔴';
              let bgColor = 'rgba(239, 68, 68, 0.05)';
              
              if (isCompleted) {
                statusText = ' [✅ เสร็จสิ้น]';
                statusColor = '#10b981'; // Green
                icon = '✅';
                bgColor = 'rgba(16, 185, 129, 0.05)';
              } else if (isInProgress) {
                statusText = ' [▶️ กำลังดำเนินการ]';
                statusColor = '#3b82f6'; // Blue
                icon = '▶️';
                bgColor = 'rgba(59, 130, 246, 0.05)';
              } else if (isPending) {
                statusText = ' [⏳ รอดำเนินการ]';
                statusColor = '#f59e0b'; // Orange
                icon = '⏳';
                bgColor = 'rgba(245, 158, 11, 0.05)';
              } else if (isCancelled) {
                statusText = ' [❌ ยกเลิก]';
                statusColor = '#9ca3af'; // Gray
                icon = '❌';
                bgColor = 'rgba(156, 163, 175, 0.05)';
              }

              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px', background: bgColor, borderLeft: `4px solid ${statusColor}`, borderRadius: '6px' }}>
                  <span style={{ fontSize: '18px', marginTop: '2px' }}>{icon}</span>
                  <div>
                    <div style={{ color: statusColor, fontWeight: '600', fontSize: '14px' }}>{s.title}{statusText}</div>
                    <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '6px' }}>
                      🕒 {formatTime(s.startTime)} - {formatTime(s.endTime)} น.
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
