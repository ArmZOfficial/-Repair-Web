import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ResidentDashboard from './pages/ResidentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import TechnicianDashboard from './pages/TechnicianDashboard';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import Welcome from './pages/Welcome';
import FilesGallery from './components/FilesGallery';
import ProfileView from './components/ProfileView';

const getDashboardPath = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'technician') return '/technician';
  if (role === 'executive') return '/executive';
  return '/resident';
};

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return children;
}

// Redesigned Top Navbar matching Screenshot 1
function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  if (isAuthPage) return null;

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="navbar-brand">
          <div className="navbar-brand-icon">🔧</div>
          <span>ระบบแจ้งซ่อมมหาวิทยาลัย</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <Link
              to="/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                background: 'var(--primary)',
                color: '#ffffff',
                borderRadius: '9999px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              <span>👤</span> {user.fullName.split(' ')[0]}
            </Link>
          ) : (
            <Link
              to="/login"
              className="btn btn-primary"
              style={{ padding: '8px 20px', fontSize: '14px', borderRadius: '9999px' }}
            >
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

// Fixed Bottom Navigation Bar matching Screenshots 2, 4, 5, 6
function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const dashboardPath = getDashboardPath(user.role);
  const isQueueActive = location.pathname === dashboardPath;
  const isFilesActive = location.pathname === '/files';
  const isProfileActive = location.pathname === '/profile';

  return (
    <div className="bottom-nav">
      <Link to={dashboardPath} className={`bottom-nav-item ${isQueueActive ? 'active' : ''}`}>
        <span className="bottom-nav-icon">📋</span>
        <span>คิวงงาน</span>
      </Link>
      <Link to={dashboardPath} className="bottom-nav-item">
        <span className="bottom-nav-icon">📄</span>
        <span>งานของฉัน</span>
      </Link>
      <Link to="/files" className={`bottom-nav-item ${isFilesActive ? 'active' : ''}`}>
        <span className="bottom-nav-icon">📁</span>
        <span>ไฟล์</span>
      </Link>
      <Link to="/profile" className={`bottom-nav-item ${isProfileActive ? 'active' : ''}`}>
        <span className="bottom-nav-icon">👤</span>
        <span>โปรไฟล์</span>
      </Link>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Session expired');
      })
      .then(data => {
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
      })
      .catch(() => {
        logout();
      })
      .finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      <BrowserRouter>
        <Navbar />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to={getDashboardPath(user.role)} replace />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to={getDashboardPath(user.role)} replace />} />
          
          {/* Protected User Routes */}
          <Route 
            path="/resident" 
            element={
              <ProtectedRoute allowedRoles={['resident']}>
                <ResidentDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Protected Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Protected Technician Routes */}
          <Route 
            path="/technician" 
            element={
              <ProtectedRoute allowedRoles={['technician']}>
                <TechnicianDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Protected Executive Routes */}
          <Route 
            path="/executive" 
            element={
              <ProtectedRoute allowedRoles={['executive']}>
                <ExecutiveDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Files Gallery Route */}
          <Route 
            path="/files" 
            element={
              <ProtectedRoute>
                <FilesGallery />
              </ProtectedRoute>
            } 
          />

          {/* Profile Route */}
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfileView />
              </ProtectedRoute>
            } 
          />

          {/* Index Route Redirect */}
          <Route 
            path="*" 
            element={
              user ? (
                <Navigate to={getDashboardPath(user.role)} replace />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
        </Routes>
        <BottomNav />
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
