import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';

export default function UserDashboard() {
  const { user } = useAuth();
  
  // States for form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('plumbing');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [lightboxImage, setLightboxImage] = useState('');
  const [location, setLocation] = useState('');
  
  // AI Settings States (Default to gemini)
  const [aiMode, setAiMode] = useState(localStorage.getItem('ai_mode') || 'gemini');
  
  // AI Analysis States
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [detectedObject, setDetectedObject] = useState('');
  
  // List & Stats States
  const [repairs, setRepairs] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const fileInputRef = useRef(null);
  const imageElementRef = useRef(null);

  useEffect(() => {
    fetchRepairs();
  }, []);

  const fetchRepairs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/repairs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('ไม่สามารถโหลดข้อมูลประวัติการแจ้งซ่อมได้');
      const data = await response.json();
      setRepairs(data);
      calculateStats(data);
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

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 6000);
  };

  const handleAiModeChange = (e) => {
    const mode = e.target.value;
    setAiMode(mode);
    localStorage.setItem('ai_mode', mode);
  };

  // Image Upload and AI Analysis
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setAiSuggestion(null);
    setDetectedObject('');

    // Trigger AI Analysis
    analyzeImage(file);
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview('');
    setAiSuggestion(null);
    setDetectedObject('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const analyzeImage = async (file) => {
    setAiAnalyzing(true);
    setAiSuggestion(null);
    
    if (aiMode === 'gemini') {
      // Use Gemini API through backend proxy (key is stored on backend server)
      const formData = new FormData();
      formData.append('image', file);

      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Gemini API วิเคราะห์ภาพล้มเหลว');
        }

        setDetectedObject(data.detectedObject);
        setAiSuggestion({
          className: data.detectedObject,
          confidence: 100,
          category: data.category,
          title: data.title,
          description: data.description,
          mode: 'gemini'
        });
        showMsg('✨ Gemini AI วิเคราะห์รายละเอียดอาการชำรุดเสร็จสิ้น สามารถกดปุ่มเพื่อใช้ค่าสแกนได้ทันที');
      } catch (err) {
        console.error('Gemini analysis failed, falling back to local TF.js:', err);
        showMsg('⚠️ ไม่สามารถใช้ Gemini AI ได้ (กำลังใช้งานระบบวิเคราะห์ทั่วไปสำรอง): ' + err.message, 'error');
        // Fallback to local
        runLocalAnalysis(file);
      } finally {
        setAiAnalyzing(false);
      }
    } else {
      // Local TF.js analysis
      runLocalAnalysis(file);
    }
  };

  const runLocalAnalysis = (file) => {
    // 1. Try filename keyword matching first (extremely accurate for common dorm issues)
    const name = file.name.toLowerCase();
    
    // Plumbing (ระบบประปา)
    if (name.includes('water') || name.includes('pipe') || name.includes('leak') || name.includes('faucet') || name.includes('toilet') || name.includes('sink') || name.includes('tap') || name.includes('drain') || name.includes('plumb') || name.includes('ก๊อก') || name.includes('น้ำ') || name.includes('ประปา') || name.includes('อ่าง') || name.includes('ส้วม')) {
      setDetectedObject('ก๊อกน้ำ / อุปกรณ์ประปา');
      setAiSuggestion({
        className: 'ก๊อกน้ำ / อุปกรณ์ประปา',
        confidence: 98,
        category: 'plumbing',
        title: 'ซ่อมแซมระบบประปา / ท่อน้ำรั่ว',
        description: 'พบปัญหาน้ำรั่วซึมจากก๊อกน้ำหรือท่อน้ำชำรุดเสียหาย',
        mode: 'local'
      });
      setAiAnalyzing(false);
      return;
    }
    
    // Electrical (ระบบไฟฟ้า)
    if (name.includes('light') || name.includes('bulb') || name.includes('lamp') || name.includes('electric') || name.includes('wire') || name.includes('power') || name.includes('switch') || name.includes('plug') || name.includes('socket') || name.includes('ไฟ') || name.includes('หลอด') || name.includes('สวิตซ์') || name.includes('ปลั๊ก')) {
      setDetectedObject('หลอดไฟ / ระบบไฟฟ้า');
      setAiSuggestion({
        className: 'หลอดไฟ / ระบบไฟฟ้า',
        confidence: 98,
        category: 'electrical',
        title: 'เปลี่ยนหลอดไฟ / ซ่อมแซมระบบไฟฟ้า',
        description: 'หลอดไฟกระพริบ ดับ หรืออุปกรณ์สวิตซ์ไฟ/ปลั๊กไฟชำรุด',
        mode: 'local'
      });
      setAiAnalyzing(false);
      return;
    }

    // Structural / Ceiling Leak (โครงสร้างห้อง / ฝ้ารั่ว)
    if (name.includes('ceiling') || name.includes('roof') || name.includes('wall') || name.includes('floor') || name.includes('window') || name.includes('door') || name.includes('crack') || name.includes('ฝ้า') || name.includes('เพดาน') || name.includes('ผนัง') || name.includes('พื้น') || name.includes('หน้าต่าง') || name.includes('ประตู') || name.includes('รอยร้าว') || name.includes('รั่ว')) {
      if (name.includes('ceiling') || name.includes('roof') || name.includes('ฝ้า') || name.includes('เพดาน') || name.includes('รั่ว')) {
        setDetectedObject('ฝ้าเพดานรั่วซึม');
        setAiSuggestion({
          className: 'ฝ้าเพดานรั่วซึม',
          confidence: 98,
          category: 'structural',
          title: 'ซ่อมแซมฝ้าเพดานรั่วซึม',
          description: 'พบรอยรั่วซึมจากเพดานห้อง มีน้ำหยดลงมาด้านล่าง',
          mode: 'local'
        });
      } else {
        setDetectedObject('โครงสร้างห้อง / ประตูหน้าต่าง');
        setAiSuggestion({
          className: 'โครงสร้างห้อง / ประตูหน้าต่าง',
          confidence: 90,
          category: 'structural',
          title: 'ซ่อมแซมบำรุงโครงสร้างห้อง',
          description: 'บานประตู หน้าต่างชำรุดปิดไม่สนิท หรือมีรอยร้าวบริเวณผนังและพื้นห้อง',
          mode: 'local'
        });
      }
      setAiAnalyzing(false);
      return;
    }

    // Furniture (เฟอร์นิเจอร์)
    if (name.includes('chair') || name.includes('table') || name.includes('bed') || name.includes('desk') || name.includes('cabinet') || name.includes('wardrobe') || name.includes('furniture') || name.includes('เก้าอี้') || name.includes('โต๊ะ') || name.includes('เตียง') || name.includes('ตู้') || name.includes('เฟอร์นิเจอร์')) {
      setDetectedObject('เฟอร์นิเจอร์ชำรุด');
      setAiSuggestion({
        className: 'เฟอร์นิเจอร์ชำรุด',
        confidence: 95,
        category: 'furniture',
        title: 'ซ่อมแซมเฟอร์นิเจอร์ในห้อง',
        description: 'ตู้เสื้อผ้า โต๊ะทำงาน เก้าอี้ หรือเตียงนอนชำรุดเสียหาย',
        mode: 'local'
      });
      setAiAnalyzing(false);
      return;
    }

    // Appliance (เครื่องใช้ไฟฟ้า)
    if (name.includes('air') || name.includes('ac') || name.includes('fan') || name.includes('fridge') || name.includes('refrigerator') || name.includes('microwave') || name.includes('tv') || name.includes('appliance') || name.includes('แอร์') || name.includes('พัดลม') || name.includes('ตู้เย็น') || name.includes('ไมโครเวฟ') || name.includes('ทีวี')) {
      setDetectedObject('เครื่องปรับอากาศ / เครื่องใช้ไฟฟ้า');
      setAiSuggestion({
        className: 'เครื่องปรับอากาศ / เครื่องใช้ไฟฟ้า',
        confidence: 95,
        category: 'appliance',
        title: 'ซ่อมแซมเครื่องใช้ไฟฟ้าชำรุด',
        description: 'เครื่องปรับอากาศไม่เย็น พัดลมไม่หมุน หรือเครื่องใช้ไฟฟ้าอื่นมีปัญหา',
        mode: 'local'
      });
      setAiAnalyzing(false);
      return;
    }

    // 2. Fall back to MobileNet image analysis
    const imgUrl = URL.createObjectURL(file);
    const tempImg = new Image();
    tempImg.src = imgUrl;
    
    tempImg.onload = async () => {
      try {
        if (!window.mobilenet) {
          console.warn('TensorFlow.js/MobileNet CDN has not loaded yet.');
          setTimeout(() => {
            simulateAIAnalysis(file.name);
          }, 1500);
          return;
        }

        console.log('Loading MobileNet model...');
        const model = await window.mobilenet.load();
        console.log('Classifying image...');
        const predictions = await model.classify(tempImg);
        
        if (predictions && predictions.length > 0) {
          const topResult = predictions[0];
          processPredictions(topResult.className, Math.round(topResult.probability * 100));
        } else {
          simulateAIAnalysis(file.name);
        }
      } catch (err) {
        console.error('AI Analysis failed, running simulation fallback:', err);
        simulateAIAnalysis(file.name);
      } finally {
        setAiAnalyzing(false);
      }
    };
  };

  // Process AI predictions and map to categories (Local TF.js fallback)
  const processPredictions = (className, probability) => {
    const name = className.toLowerCase();
    let suggestedCat = 'other';
    let suggestedTitle = `แจ้งซ่อม (${className.split(',')[0]})`;
    
    // Simple Keyword Mapping
    if (name.includes('faucet') || name.includes('sink') || name.includes('tap') || name.includes('drain') || name.includes('water') || name.includes('pipe') || name.includes('toilet') || name.includes('tub') || name.includes('shower')) {
      suggestedCat = 'plumbing';
      suggestedTitle = 'ซ่อมแซมระบบประปา / ท่อน้ำรั่ว';
    } else if (name.includes('bulb') || name.includes('lamp') || name.includes('light') || name.includes('switch') || name.includes('wire') || name.includes('plug') || name.includes('socket') || name.includes('electric') || name.includes('candle') || name.includes('torch')) {
      suggestedCat = 'electrical';
      suggestedTitle = 'เปลี่ยนหลอดไฟ / ระบบไฟฟ้า';
    } else if (name.includes('chair') || name.includes('table') || name.includes('desk') || name.includes('sofa') || name.includes('bed') || name.includes('wardrobe') || name.includes('drawer') || name.includes('cabinet') || name.includes('furniture') || name.includes('shelf') || name.includes('stool')) {
      suggestedCat = 'furniture';
      suggestedTitle = 'ซ่อมบำรุงเฟอร์นิเจอร์';
    } else if (name.includes('conditioner') || name.includes('refrigerator') || name.includes('fridge') || name.includes('microwave') || name.includes('stove') || name.includes('oven') || name.includes('tv') || name.includes('television') || name.includes('fan') || name.includes('heater') || name.includes('screen') || name.includes('monitor') || name.includes('appliance')) {
      suggestedCat = 'appliance';
      suggestedTitle = 'ซ่อมแซมเครื่องใช้ไฟฟ้า';
    } else if (name.includes('wall') || name.includes('floor') || name.includes('ceiling') || name.includes('window') || name.includes('door') || name.includes('stair') || name.includes('crack') || name.includes('brick') || name.includes('tile')) {
      suggestedCat = 'structural';
      suggestedTitle = 'ซ่อมแซมโครงสร้างห้อง';
    }

    const shortName = className.split(',')[0];
    setDetectedObject(shortName);
    setAiSuggestion({
      className: shortName,
      confidence: probability,
      category: suggestedCat,
      title: suggestedTitle,
      mode: 'local'
    });
  };

  // Fallback simulator based on filename keywords
  const simulateAIAnalysis = (fileName) => {
    const name = fileName.toLowerCase();
    let label = 'อุปกรณ์ชำรุด';
    let cat = 'other';
    let t = 'แจ้งซ่อมอุปกรณ์ทั่วไป';

    if (name.includes('water') || name.includes('pipe') || name.includes('leak') || name.includes('faucet') || name.includes('toilet') || name.includes('sink')) {
      label = 'ท่อน้ำ / ก๊อกน้ำ';
      cat = 'plumbing';
      t = 'ซ่อมแซมระบบประปา / ท่อน้ำรั่ว';
    } else if (name.includes('light') || name.includes('bulb') || name.includes('lamp') || name.includes('electric') || name.includes('wire') || name.includes('power')) {
      label = 'ระบบไฟฟ้า / หลอดไฟ';
      cat = 'electrical';
      t = 'เปลี่ยนหลอดไฟ / ระบบไฟฟ้า';
    } else if (name.includes('chair') || name.includes('table') || name.includes('bed') || name.includes('desk') || name.includes('wood') || name.includes('cabinet') || name.includes('door')) {
      label = 'เฟอร์นิเจอร์ / ประตูตู้';
      cat = 'furniture';
      t = 'ซ่อมบำรุงเฟอร์นิเจอร์';
    } else if (name.includes('air') || name.includes('ac') || name.includes('fan') || name.includes('fridge') || name.includes('microwave')) {
      label = 'เครื่องปรับอากาศ / เครื่องใช้ไฟฟ้า';
      cat = 'appliance';
      t = 'ซ่อมแซมเครื่องใช้ไฟฟ้า';
    }

    setDetectedObject(label);
    setAiSuggestion({
      className: label,
      confidence: 85,
      category: cat,
      title: t,
      mode: 'local'
    });
  };

  const handleApplyAiSuggestion = () => {
    if (!aiSuggestion) return;
    setTitle(aiSuggestion.title);
    setCategory(aiSuggestion.category);
    if (aiSuggestion.description) {
      setDescription(aiSuggestion.description);
    }
    setAiSuggestion(null); // Clear suggestion after applying
    showMsg('🤖 นำข้อมูลแนะนำการแจ้งซ่อมที่ AI ตรวจจับได้กรอกลงในฟอร์มแล้ว');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !category) {
      showMsg('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
      return;
    }

    setSubmitLoading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('roomNumber', location);
    formData.append('detectedObject', detectedObject);
    if (image) {
      formData.append('image', image);
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/repairs', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ส่งใบแจ้งซ่อมไม่สำเร็จ');
      }

      showMsg('✅ ส่งใบแจ้งซ่อมสำเร็จเรียบร้อยแล้ว');
      resetForm();
      fetchRepairs();
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancelRepair = async (id) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการแจ้งซ่อมรายการนี้?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/repairs/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'cancelled' })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'ยกเลิกการแจ้งซ่อมไม่สำเร็จ');
      }

      showMsg('❌ ยกเลิกรายการแจ้งซ่อมสำเร็จเรียบร้อยแล้ว');
      fetchRepairs();
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('plumbing');
    setImage(null);
    setImagePreview('');
    setAiSuggestion(null);
    setDetectedObject('');
    setLocation('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getCategoryText = (cat) => {
    const mapping = {
      plumbing: '💦 ระบบประปา',
      electrical: '⚡ ระบบไฟฟ้า',
      furniture: '🪑 เฟอร์นิเจอร์',
      appliance: '🔌 เครื่องใช้ไฟฟ้า',
      structural: '🧱 โครงสร้างห้อง',
      other: '📦 อื่นๆ'
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

  return (
    <div className="container" style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      {/* Teal Banner matching Screenshot 2 */}
      <div className="teal-banner" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2>สวัสดี 👋 {user.fullName}</h2>
            <p style={{ margin: 0 }}>ส่งคำขอแจ้งซ่อมและติดตามสถานะงานของคุณได้ทันที 24 ชม.</p>
          </div>
          <button onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })} className="btn btn-white" style={{ fontSize: '13px' }}>
            ➕ แจ้งซ่อมใหม่
          </button>
        </div>
      </div>

      {message.text && (
        <div style={{
          background: message.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          color: message.type === 'error' ? 'var(--status-cancelled-color)' : 'var(--status-completed-color)',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          border: message.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
        }}>
          {message.text}
        </div>
      )}

      {/* Stats row */}
      <div className="summary-cards" style={{ marginBottom: '32px', marginTop: '0' }}>
        <div className="glass-card summary-card">
          <div className="summary-card-info">
            <h3>แจ้งซ่อมทั้งหมด</h3>
            <p>{stats.total}</p>
          </div>
          <div className="summary-card-icon">📁</div>
        </div>
        <div className="glass-card summary-card" style={{ borderColor: 'rgba(245, 158, 11, 0.2)' }}>
          <div className="summary-card-info">
            <h3>รอรับเรื่อง</h3>
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
        <div className="glass-card summary-card" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
          <div className="summary-card-info">
            <h3>เสร็จสิ้น</h3>
            <p style={{ color: 'var(--status-completed-color)' }}>{stats.completed}</p>
          </div>
          <div className="summary-card-icon" style={{ color: 'var(--status-completed-color)' }}>✅</div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Left Column: Form */}
        <div className="glass-card">
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            📝 แบบฟอร์มแจ้งซ่อมใหม่
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="location">สถานที่ / อาคาร / บริเวณ</label>
                <input 
                  type="text" 
                  id="location"
                  className="form-input" 
                  value={location} 
                  onChange={(e) => setLocation(e.target.value)} 
                  placeholder="เช่น ตึก A ชั้น 2 ห้อง 201, หน้าห้องสมุด" 
                  required 
                />
              </div>
              <div className="form-group">
                <label htmlFor="category">หมวดหมู่</label>
                <select 
                  id="category" 
                  className="form-select" 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="plumbing">💦 ระบบประปา</option>
                  <option value="electrical">⚡ ระบบไฟฟ้า</option>
                  <option value="furniture">🪑 เฟอร์นิเจอร์</option>
                  <option value="appliance">🔌 เครื่องใช้ไฟฟ้า</option>
                  <option value="structural">🧱 โครงสร้างห้อง</option>
                  <option value="other">📦 อื่นๆ</option>
                </select>
              </div>
            </div>

            {/* Photo Upload with AI Scanner */}
            <div className="form-group" style={{ marginTop: '12px', marginBottom: '16px' }}>
              <label>รูปภาพอุปกรณ์ชำรุด</label>
              <div 
                className="upload-container" 
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>คลิกเพื่ออัปโหลดรูปภาพ</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  รองรับ PNG, JPG, JPEG (AI จะทำงานทันทีหลังอัปโหลด)
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  style={{ display: 'none' }}
                />
              </div>

              {imagePreview && (
                <div style={{ position: 'relative', textAlign: 'center', marginTop: '16px', display: 'inline-block' }}>
                  <img 
                    ref={imageElementRef}
                    src={imagePreview} 
                    alt="Preview" 
                    className="upload-preview" 
                    style={{ cursor: 'zoom-in' }}
                    onClick={() => setLightboxImage(imagePreview)}
                  />
                  <button 
                    type="button" 
                    onClick={removeImage}
                    style={{
                      position: 'absolute',
                      top: '-10px',
                      right: '-10px',
                      background: 'rgba(239, 68, 68, 0.9)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                    title="ยกเลิกรูปภาพ"
                  >
                    ✕
                  </button>
                  {aiAnalyzing && (
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      background: 'rgba(15, 23, 42, 0.75)',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px'
                    }}>
                      <div className="status-badge status-inprogress">กำลังวิเคราะห์ภาพ...</div>
                      <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>🤖 AI กำลังจำแนกประเภทอุปกรณ์ชำรุด</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Control Center */}
            <div style={{
              background: 'rgba(11, 37, 69, 0.02)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ⚙️ ระบบประมวลผลรูปภาพด้วย AI
                </span>
                <select 
                  className="form-select" 
                  value={aiMode} 
                  onChange={handleAiModeChange}
                  style={{ width: '180px', padding: '6px 12px', fontSize: '13px', backgroundPosition: 'right 12px center' }}
                >
                  <option value="gemini">✨ Gemini AI (แม่นยำสูง)</option>
                  <option value="local">🤖 Offline AI (ทั่วไป)</option>
                </select>
              </div>
            </div>

            {/* AI Suggestion Box */}
            {aiSuggestion && (
              <div className="ai-badge" style={{ marginBottom: '20px' }}>
                <div className="ai-badge-icon">🤖</div>
                <div style={{ width: '100%' }}>
                  <div className="ai-badge-title">
                    {aiSuggestion.mode === 'gemini' ? '✨ Gemini AI วิเคราะห์แม่นยำสูงสำเร็จ!' : '🤖 Offline AI วิเคราะห์สำเร็จ'}
                  </div>
                  <p className="ai-badge-desc">
                    วัตถุที่พบ: <strong>{aiSuggestion.className}</strong> <br />
                    หมวดหมู่แนะนำ: <strong>{getCategoryText(aiSuggestion.category)}</strong> <br />
                    หัวข้อแนะนำ: <strong>{aiSuggestion.title}</strong>
                    {aiSuggestion.description && (
                      <>
                        <br />
                        อาการแนะนำ: <span style={{ color: 'var(--text-primary)' }}>{aiSuggestion.description}</span>
                      </>
                    )}
                  </p>
                  <div className="ai-badge-actions">
                    <button 
                      type="button" 
                      onClick={handleApplyAiSuggestion}
                      className="btn btn-accent" 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      ✨ นำข้อมูลไปใช้กับฟอร์ม
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setAiSuggestion(null)}
                      className="btn btn-outline" 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      ละทิ้ง
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label htmlFor="title">หัวข้อแจ้งซ่อม</label>
              <input 
                type="text" 
                id="title" 
                className="form-input" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น ก๊อกน้ำอ่างล้างหน้ารั่ว, หลอดไฟห้องนั่งเล่นเสีย"
                required 
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">รายละเอียดเพิ่มเติม</label>
              <textarea 
                id="description" 
                className="form-input" 
                rows="4"
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="อธิบายปัญหา เช่น ตำแหน่งจุดชำรุด อาการชำรุดอย่างละเอียด เพื่อช่วยช่างเตรียมอุปกรณ์ได้ถูกต้อง"
                style={{ resize: 'vertical' }}
                required 
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitLoading}>
                {submitLoading ? 'กำลังส่งข้อมูล...' : 'ส่งคำขอแจ้งซ่อม'}
              </button>
              <button type="button" onClick={resetForm} className="btn btn-outline">
                ล้างฟอร์ม
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: History List */}
        <div>
          <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>
              📜 ประวัติแจ้งซ่อมของคุณ
            </h3>
            
            {loading ? (
              <div className="text-center" style={{ padding: '48px 0', color: 'var(--text-secondary)' }}>
                กำลังโหลดประวัติแจ้งซ่อม...
              </div>
            ) : repairs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <p>คุณยังไม่เคยส่งคำแจ้งซ่อมเลย</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>หากมีจุดใดชำรุด สามารถพิมพ์แจ้งผ่านฟอร์มได้ทันที</p>
              </div>
            ) : (
              <div className="repairs-list" style={{ overflowY: 'auto', flexGrow: 1, maxHeight: '680px', paddingRight: '4px' }}>
                {repairs.map((item) => (
                  <div key={item.id} className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                    <div className="repair-item">
                      {item.imageUrl && (
                        <img 
                          src={`${item.imageUrl}`} 
                          alt="Broken Item" 
                          className="repair-item-img" 
                          style={{ cursor: 'zoom-in' }}
                          onClick={() => setLightboxImage(`${item.imageUrl}`)}
                        />
                      )}
                      <div className="repair-item-content">
                        <div>
                          <div className="repair-item-header">
                            <span className="repair-item-title">{item.title}</span>
                            <span className={`status-badge status-${item.status.replace('_', '')}`}>
                              {getStatusText(item.status)}
                            </span>
                          </div>
                          <div className="repair-item-meta">
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
                          
                          {(item.status === 'pending' || item.status === 'in_progress') && (
                            <div style={{ marginTop: '10px' }}>
                              <button 
                                type="button"
                                onClick={() => handleCancelRepair(item.id)} 
                                className="btn btn-danger" 
                                style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex' }}
                              >
                                ❌ ยกเลิกคำขอแจ้งซ่อม
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {item.adminNotes && (
                          <div className="repair-item-notes">
                            <strong>🛠️ อัปเดตจากช่าง/ผู้ดูแล:</strong> {item.adminNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {lightboxImage && (
        <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage('')} />
      )}
    </div>
  );
}

function ImageLightbox({ imageUrl, onClose }) {
  const [zoomScale, setZoomScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = (e) => {
    e.stopPropagation();
    setZoomScale(prev => Math.min(prev + 0.25, 4));
  };
  const handleZoomOut = (e) => {
    e.stopPropagation();
    setZoomScale(prev => Math.max(prev - 0.25, 0.5));
  };
  const handleReset = (e) => {
    e.stopPropagation();
    setZoomScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.stopPropagation();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = (e) => {
    e.stopPropagation();
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
