require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { getDbReady, getTable, setTable, getNextId } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dorm-repair-app-jwt-secret-key-12345';

// Ensure uploads folder exists
const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const uploadsDir = isVercel
  ? path.join('/tmp', 'uploads')
  : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());

// Ensure database is ready before handling any request
app.use(async (req, res, next) => {
  try {
    await getDbReady();
    next();
  } catch (err) {
    console.error('Database init error:', err);
    res.status(500).json({ error: 'Database initialization failed' });
  }
});

app.use('/uploads', express.static(uploadsDir));

const frontendBuildPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
}

// Multer configuration for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// JWT middleware helper
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---

// Register
app.post('/api/auth/register', upload.single('avatar'), async (req, res) => {
  try {
    const { username, password, fullName, userType, role } = req.body;

    if (!username || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    if (role !== 'resident') {
      return res.status(400).json({ error: 'Only resident registration is allowed.' });
    }

    const users = await getTable('users');
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const avatarUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const newId = await getNextId('users');
    const newUser = {
      id: newId,
      username,
      password: hashedPassword,
      fullName,
      userType: role === 'admin' ? null : userType,
      role,
      avatarUrl,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    await setTable('users', users);

    const token = jwt.sign({ id: newId, username, role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: { id: newId, username, fullName, userType: newUser.userType, role, avatarUrl }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Please enter both username and password.' });
    }

    const users = await getTable('users');
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        roomNumber: user.roomNumber,
        role: user.role,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const users = await getTable('users');
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Update profile
app.put('/api/auth/profile', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const { fullName, userType, newPassword } = req.body;
    const userId = req.user.id;

    if (!fullName) {
      return res.status(400).json({ error: 'Full name is required.' });
    }

    const users = await getTable('users');
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found.' });
    }

    users[userIndex].fullName = fullName;
    if (userType) {
      users[userIndex].userType = userType;
    }

    if (newPassword && newPassword.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      users[userIndex].password = await bcrypt.hash(newPassword, salt);
    }

    if (req.file) {
      users[userIndex].avatarUrl = `/uploads/${req.file.filename}`;
    }

    await setTable('users', users);

    const { password, ...updatedUser } = users[userIndex];
    res.json({
      message: 'Profile updated successfully.',
      user: updatedUser
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- REPAIRS ROUTES ---

// Submit a new repair request
app.post('/api/repairs', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, roomNumber, detectedObject } = req.body;
    const userId = req.user.id;

    if (!title || !description || !category || !roomNumber) {
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const repairs = await getTable('repairs');
    const newId = await getNextId('repairs');
    const newRepair = {
        id: newId,
        userId,
        title,
        description,
        category,
        roomNumber,
        imageUrl,
        detectedObject: detectedObject || null,
        status: 'pending',
        adminNotes: null,
        technicianId: null,
        scheduledTime: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    repairs.push(newRepair);
    await setTable('repairs', repairs);

    res.status(201).json({
      message: 'Repair request submitted successfully.',
      repair: newRepair
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get repair list
app.get('/api/repairs', authenticateToken, async (req, res) => {
  try {
    const repairs = await getTable('repairs');
    const users = await getTable('users');
    const userMap = users.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
    
    let result = repairs;
    
    if (req.user.role === 'admin' || req.user.role === 'executive') {
      // all
    } else if (req.user.role === 'technician') {
      const techUser = users.find(u => u.id === req.user.id);
      const fullName = techUser ? techUser.fullName : '';
      let allowedCategories = [];
      
      if (fullName.includes('ไฟฟ้า') && !fullName.includes('เครื่องใช้ไฟฟ้า')) {
        allowedCategories = ['electrical'];
      } else if (fullName.includes('ประปา')) {
        allowedCategories = ['plumbing'];
      } else if (fullName.includes('โครงสร้าง')) {
        allowedCategories = ['structural'];
      } else if (fullName.includes('เครื่องใช้ไฟฟ้า')) {
        allowedCategories = ['appliance'];
      } else if (fullName.includes('เฟอร์นิเจอร์')) {
        allowedCategories = ['furniture'];
      }

      result = repairs.filter(r => 
        r.technicianId === req.user.id || 
        (r.technicianId === null && r.status === 'pending' && (allowedCategories.length === 0 || allowedCategories.includes(r.category)))
      );
    } else {
      result = repairs.filter(r => r.userId === req.user.id);
    }
    
    // Join with user data
    result = result.map(r => ({
      ...r,
      residentName: userMap[r.userId]?.fullName,
      residentAvatarUrl: userMap[r.userId]?.avatarUrl
    }));
    
    // Order by createdAt DESC
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Helper to analyze dorm problem from filename keywords (Robust fallback)
function analyzeDormProblem(filename) {
  const name = filename.toLowerCase();
  
  if (name.includes('water') || name.includes('pipe') || name.includes('leak') || name.includes('faucet') || name.includes('toilet') || name.includes('sink') || name.includes('tap') || name.includes('drain') || name.includes('plumb') || name.includes('ก๊อก') || name.includes('น้ำ') || name.includes('ประปา') || name.includes('อ่าง') || name.includes('ส้วม')) {
    return { detectedObject: 'ก๊อกน้ำ / อุปกรณ์ประปา', category: 'plumbing', title: 'ซ่อมแซมระบบประปา / ท่อน้ำรั่ว', description: 'พบปัญหาน้ำรั่วซึมจากก๊อกน้ำหรือท่อน้ำชำรุดเสียหาย' };
  }
  if (name.includes('light') || name.includes('bulb') || name.includes('lamp') || name.includes('electric') || name.includes('wire') || name.includes('power') || name.includes('switch') || name.includes('plug') || name.includes('socket') || name.includes('ไฟ') || name.includes('หลอด') || name.includes('สวิตซ์') || name.includes('ปลั๊ก')) {
    return { detectedObject: 'หลอดไฟ / ระบบไฟฟ้า', category: 'electrical', title: 'เปลี่ยนหลอดไฟ / ซ่อมแซมระบบไฟฟ้า', description: 'หลอดไฟกระพริบ ดับ หรืออุปกรณ์สวิตซ์ไฟ/ปลั๊กไฟชำรุด' };
  }
  if (name.includes('ceiling') || name.includes('roof') || name.includes('wall') || name.includes('floor') || name.includes('window') || name.includes('door') || name.includes('crack') || name.includes('ฝ้า') || name.includes('เพดาน') || name.includes('ผนัง') || name.includes('พื้น') || name.includes('หน้าต่าง') || name.includes('ประตู') || name.includes('รอยร้าว') || name.includes('รั่ว')) {
    if (name.includes('ceiling') || name.includes('roof') || name.includes('ฝ้า') || name.includes('เพดาน') || name.includes('รั่ว')) {
      return { detectedObject: 'ฝ้าเพดานรั่วซึม', category: 'structural', title: 'ซ่อมแซมฝ้าเพดานรั่วซึม', description: 'พบรอยรั่วซึมจากเพดานห้องพัก มีน้ำหยดลงมาด้านล่าง' };
    }
    return { detectedObject: 'โครงสร้างห้องพัก / ประตูหน้าต่าง', category: 'structural', title: 'ซ่อมแซมบำรุงโครงสร้างห้องพัก', description: 'บานประตู หน้าต่างชำรุดปิดไม่สนิท หรือมีรอยร้าวบริเวณผนังและพื้นห้อง' };
  }
  if (name.includes('chair') || name.includes('table') || name.includes('bed') || name.includes('desk') || name.includes('cabinet') || name.includes('wardrobe') || name.includes('furniture') || name.includes('เก้าอี้') || name.includes('โต๊ะ') || name.includes('เตียง') || name.includes('ตู้') || name.includes('เฟอร์นิเจอร์')) {
    return { detectedObject: 'เฟอร์นิเจอร์ชำรุด', category: 'furniture', title: 'ซ่อมแซมเฟอร์นิเจอร์ในห้องพัก', description: 'ตู้เสื้อผ้า โต๊ะทำงาน เก้าอี้ หรือเตียงนอนชำรุดเสียหาย' };
  }
  if (name.includes('air') || name.includes('ac') || name.includes('fan') || name.includes('fridge') || name.includes('refrigerator') || name.includes('microwave') || name.includes('tv') || name.includes('appliance') || name.includes('แอร์') || name.includes('พัดลม') || name.includes('ตู้เย็น') || name.includes('ไมโครเวฟ') || name.includes('ทีวี')) {
    return { detectedObject: 'เครื่องปรับอากาศ / เครื่องใช้ไฟฟ้า', category: 'appliance', title: 'ซ่อมแซมเครื่องใช้ไฟฟ้าชำรุด', description: 'เครื่องปรับอากาศไม่เย็น พัดลมไม่หมุน หรือเครื่องใช้ไฟฟ้าอื่นมีปัญหา' };
  }
  return { detectedObject: 'อุปกรณ์ทั่วไปชำรุด', category: 'other', title: 'แจ้งซ่อมอุปกรณ์ทั่วไป', description: 'พบปัญหารายการชำรุดเสียหายในห้องพัก ต้องการให้ช่างเข้าตรวจสอบรายละเอียดเพิ่มเติม' };
}

// --- AI GEMINI API ENDPOINT ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

app.post('/api/ai/analyze', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const apiKey = GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API Key is not configured on the server.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded.' });
    }

    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
                { text: "You are an expert facility management AI. Analyze this image of an object in a dormitory room that needs repair. Identify the main object in the image in Thai (e.g., 'หลอดไฟ', 'ก๊อกน้ำอ่างล้างหน้า', 'บานพับตู้เสื้อผ้า'). If the damage is not clearly visible, just identify the object itself. Select the most appropriate category STRICTLY from this list: ['plumbing', 'electrical', 'furniture', 'appliance', 'structural', 'other']. Suggest a clear, concise Thai title for the repair ticket (e.g. 'แจ้งซ่อมหลอดไฟ'). Write a short Thai description based on what the object is, mentioning that it needs inspection or repair. Do not invent or hallucinate damages (like water leaks) if you don't clearly see them. Return the result strictly in JSON format as: { \"detectedObject\": \"...\", \"category\": \"...\", \"title\": \"...\", \"description\": \"...\" } without any markdown backticks or other text." },
                { inlineData: { mimeType: req.file.mimetype, data: base64Image } }
          ]}],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Failed to analyze image with Gemini API');

      const textResult = data.candidates[0].content.parts[0].text;
      const jsonResult = JSON.parse(textResult);

      try { fs.unlinkSync(imagePath); } catch (e) {}
      res.json(jsonResult);
    } catch (apiErr) {
      console.warn('Gemini API failed, falling back to keyword heuristic analysis:', apiErr.message);
      const fallbackResult = analyzeDormProblem(req.file.originalname);
      try { fs.unlinkSync(imagePath); } catch (e) {}
      res.json(fallbackResult);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Error analyzing image' });
  }
});

// Update repair status
app.put('/api/repairs/:id/status', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, adminNotes, technicianId, scheduledTime } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required.' });

    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

    const repairs = await getTable('repairs');
    const rIndex = repairs.findIndex(r => r.id === id);
    if (rIndex === -1) return res.status(404).json({ error: 'Repair request not found.' });
    
    const repair = repairs[rIndex];

    if (req.user.role !== 'admin' && req.user.role !== 'technician') {
      if (repair.userId !== req.user.id) return res.status(403).json({ error: 'Access denied. You cannot modify other residents\\' requests.' });
      if (status !== 'cancelled') return res.status(400).json({ error: 'Residents can only cancel their own repair requests.' });
      if (repair.status !== 'pending' && repair.status !== 'in_progress') return res.status(400).json({ error: 'Cannot cancel a request that is already completed or cancelled.' });
    }

    const finalAdminNotes = (req.user.role === 'admin' || req.user.role === 'technician')
      ? (adminNotes !== undefined ? adminNotes : repair.adminNotes) 
      : (repair.adminNotes ? `${repair.adminNotes} (ยกเลิกโดยผู้แจ้ง)` : 'ยกเลิกโดยผู้แจ้ง');

    repair.status = status;
    repair.adminNotes = finalAdminNotes;
    
    if (req.user.role === 'admin' || req.user.role === 'technician') {
      if (technicianId !== undefined) repair.technicianId = technicianId || null;
      if (scheduledTime !== undefined) repair.scheduledTime = scheduledTime || null;
    }
    
    repair.updatedAt = new Date().toISOString();
    
    await setTable('repairs', repairs);

    res.json({
      message: 'Repair status updated successfully.',
      repair
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Delete all repair requests
app.delete('/api/repairs', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only admins can clear all repair requests.' });
    }

    const schedules = await getTable('technician_schedules');
    const newSchedules = schedules.filter(s => s.repairId == null);
    await setTable('technician_schedules', newSchedules);
    await setTable('repairs', []);
    
    res.json({ message: 'All repair requests and their schedules cleared successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Delete a specific repair request
app.delete('/api/repairs/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only admins can delete individual requests.' });
    }

    const id = parseInt(req.params.id);
    const repairs = await getTable('repairs');
    const rIndex = repairs.findIndex(r => r.id === id);
    if (rIndex === -1) {
      return res.status(404).json({ error: 'Repair request not found.' });
    }

    const newRepairs = repairs.filter(r => r.id !== id);
    await setTable('repairs', newRepairs);
    
    const schedules = await getTable('technician_schedules');
    const newSchedules = schedules.filter(s => s.repairId !== id);
    await setTable('technician_schedules', newSchedules);
    
    res.json({ message: `Repair request #${id} deleted successfully.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- TECHNICIANS & SCHEDULES ---
app.get('/api/technicians', authenticateToken, async (req, res) => {
  try {
    const users = await getTable('users');
    const technicians = users.filter(u => u.role === 'technician')
                             .map(u => ({ id: u.id, username: u.username, fullName: u.fullName, avatarUrl: u.avatarUrl }));
    res.json(technicians);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/technicians/schedule', authenticateToken, async (req, res) => {
  try {
    const schedules = await getTable('technician_schedules');
    const users = await getTable('users');
    const repairs = await getTable('repairs');
    
    const userMap = users.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
    const repairMap = repairs.reduce((acc, r) => { acc[r.id] = r; return acc; }, {});
    
    let result = schedules.map(s => ({
      ...s,
      technicianName: userMap[s.technicianId]?.fullName,
      repairStatus: repairMap[s.repairId]?.status
    }));
    
    result.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/api/technicians/schedule', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'technician' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const { title, startTime, endTime, technicianId, repairId } = req.body;
    const targetTechId = req.user.role === 'technician' ? req.user.id : technicianId;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const schedules = await getTable('technician_schedules');
    const newId = await getNextId('technician_schedules');
    const newSchedule = {
      id: newId,
      technicianId: targetTechId,
      title,
      startTime,
      endTime,
      repairId: repairId || null
    };
    
    schedules.push(newSchedule);
    await setTable('technician_schedules', schedules);
    
    res.status(201).json({ message: 'Schedule added successfully.', id: newId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- ANALYTICS ---
app.get('/api/analytics/yearly', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'executive' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    
    const repairs = await getTable('repairs');
    const total = repairs.length;
    
    const statusMap = {};
    const categoryMap = {};
    const monthlyMap = {};
    
    const currentYear = new Date().getFullYear().toString();
    
    repairs.forEach(r => {
      statusMap[r.status] = (statusMap[r.status] || 0) + 1;
      categoryMap[r.category] = (categoryMap[r.category] || 0) + 1;
      
      const rDate = new Date(r.createdAt);
      if (rDate.getFullYear().toString() === currentYear) {
         let month = (rDate.getMonth() + 1).toString().padStart(2, '0');
         monthlyMap[month] = (monthlyMap[month] || 0) + 1;
      }
    });
    
    const statusCounts = Object.keys(statusMap).map(k => ({ status: k, count: statusMap[k] }));
    const categoryCounts = Object.keys(categoryMap).map(k => ({ category: k, count: categoryMap[k] }));
    const monthlyCounts = Object.keys(monthlyMap).map(k => ({ month: k, count: monthlyMap[k] }));

    res.json({
      total,
      statusCounts,
      categoryCounts,
      monthlyCounts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- USERS MANAGEMENT ROUTES (Admin only) ---
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const users = await getTable('users');
    let result = users.map(u => ({
      id: u.id, username: u.username, fullName: u.fullName, userType: u.userType, role: u.role, avatarUrl: u.avatarUrl, createdAt: u.createdAt
    }));
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const { fullName, userType, role } = req.body;
    const userId = parseInt(req.params.id);

    const users = await getTable('users');
    const uIndex = users.findIndex(u => u.id === userId);
    if (uIndex !== -1) {
      users[uIndex].fullName = fullName;
      users[uIndex].userType = userType;
      users[uIndex].role = role;
      await setTable('users', users);
    }
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const userId = parseInt(req.params.id);
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself.' });
    }
    const users = await getTable('users');
    const newUsers = users.filter(u => u.id !== userId);
    await setTable('users', newUsers);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Catch-all route
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
