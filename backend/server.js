require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const db = require('./database');

const app = express();
const PORT = 5000;
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

// Normalize URL for Vercel serverless / multi-service where /api prefix might be stripped when mounted at /api
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/uploads') && req.url !== '/') {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
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

// Database helper promises
const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
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

    // Check if user exists
    const existingUser = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const avatarUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await dbRun(
      'INSERT INTO users (username, password, fullName, userType, role, avatarUrl) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, fullName, role === 'admin' ? null : userType, role, avatarUrl]
    );

    const token = jwt.sign({ id: result.id, username, role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: { id: result.id, username, fullName, userType, role, avatarUrl }
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

    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
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
    const user = await dbGet('SELECT id, username, fullName, userType, role, avatarUrl, createdAt FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(user);
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

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let sql = 'UPDATE users SET fullName = ?';
    let params = [fullName];

    if (userType) {
      sql += ', userType = ?';
      params.push(userType);
    }

    if (newPassword && newPassword.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      sql += ', password = ?';
      params.push(hashedPassword);
    }

    if (req.file) {
      const avatarUrl = `/uploads/${req.file.filename}`;
      sql += ', avatarUrl = ?';
      params.push(avatarUrl);
    }

    sql += ' WHERE id = ?';
    params.push(userId);

    await dbRun(sql, params);

    const updatedUser = await dbGet('SELECT id, username, fullName, userType, role, avatarUrl, createdAt FROM users WHERE id = ?', [userId]);

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

// Submit a new repair request (Residents only, but let's just make it authenticated)
app.post('/api/repairs', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, roomNumber, detectedObject } = req.body;
    const userId = req.user.id;

    if (!title || !description || !category || !roomNumber) {
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await dbRun(
      `INSERT INTO repairs (userId, title, description, category, roomNumber, imageUrl, detectedObject, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, title, description, category, roomNumber, imageUrl, detectedObject || null]
    );

    const newRepair = await dbGet('SELECT * FROM repairs WHERE id = ?', [result.id]);

    res.status(201).json({
      message: 'Repair request submitted successfully.',
      repair: newRepair
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get repair list (Admin gets all, Residents get only theirs)
app.get('/api/repairs', authenticateToken, async (req, res) => {
  try {
    let repairs;
    if (req.user.role === 'admin' || req.user.role === 'executive') {
      repairs = await dbAll(
        `SELECT r.*, u.fullName as residentName, u.avatarUrl as residentAvatarUrl 
         FROM repairs r 
         JOIN users u ON r.userId = u.id 
         ORDER BY r.createdAt DESC`
      );
    } else if (req.user.role === 'technician') {
      const techUser = await dbGet('SELECT fullName FROM users WHERE id = ?', [req.user.id]);
      const fullName = techUser ? techUser.fullName : '';
      let categoryFilter = '';
      
      if (fullName.includes('ไฟฟ้า') && !fullName.includes('เครื่องใช้ไฟฟ้า')) {
        categoryFilter = "AND r.category = 'electrical'";
      } else if (fullName.includes('ประปา')) {
        categoryFilter = "AND r.category = 'plumbing'";
      } else if (fullName.includes('โครงสร้าง')) {
        categoryFilter = "AND r.category = 'structural'";
      } else if (fullName.includes('เครื่องใช้ไฟฟ้า')) {
        categoryFilter = "AND r.category = 'appliance'";
      } else if (fullName.includes('เฟอร์นิเจอร์')) {
        categoryFilter = "AND r.category = 'furniture'";
      }

      repairs = await dbAll(
        `SELECT r.*, u.fullName as residentName, u.avatarUrl as residentAvatarUrl 
         FROM repairs r 
         JOIN users u ON r.userId = u.id 
         WHERE r.technicianId = ? OR (r.technicianId IS NULL AND r.status = 'pending' ${categoryFilter})
         ORDER BY r.createdAt DESC`,
        [req.user.id]
      );
    } else {
      repairs = await dbAll(
        `SELECT * FROM repairs 
         WHERE userId = ? 
         ORDER BY createdAt DESC`,
        [req.user.id]
      );
    }
    res.json(repairs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Helper to analyze dorm problem from filename keywords (Robust fallback)
function analyzeDormProblem(filename) {
  const name = filename.toLowerCase();
  
  // 1. Plumbing (ระบบประปา)
  if (name.includes('water') || name.includes('pipe') || name.includes('leak') || name.includes('faucet') || name.includes('toilet') || name.includes('sink') || name.includes('tap') || name.includes('drain') || name.includes('plumb') || name.includes('ก๊อก') || name.includes('น้ำ') || name.includes('ประปา') || name.includes('อ่าง') || name.includes('ส้วม')) {
    return {
      detectedObject: 'ก๊อกน้ำ / อุปกรณ์ประปา',
      category: 'plumbing',
      title: 'ซ่อมแซมระบบประปา / ท่อน้ำรั่ว',
      description: 'พบปัญหาน้ำรั่วซึมจากก๊อกน้ำหรือท่อน้ำชำรุดเสียหาย'
    };
  }
  
  // 2. Electrical (ระบบไฟฟ้า)
  if (name.includes('light') || name.includes('bulb') || name.includes('lamp') || name.includes('electric') || name.includes('wire') || name.includes('power') || name.includes('switch') || name.includes('plug') || name.includes('socket') || name.includes('ไฟ') || name.includes('หลอด') || name.includes('สวิตซ์') || name.includes('ปลั๊ก')) {
    return {
      detectedObject: 'หลอดไฟ / ระบบไฟฟ้า',
      category: 'electrical',
      title: 'เปลี่ยนหลอดไฟ / ซ่อมแซมระบบไฟฟ้า',
      description: 'หลอดไฟกระพริบ ดับ หรืออุปกรณ์สวิตซ์ไฟ/ปลั๊กไฟชำรุด'
    };
  }

  // 3. Structural (โครงสร้างห้อง / ฝ้ารั่ว)
  if (name.includes('ceiling') || name.includes('roof') || name.includes('wall') || name.includes('floor') || name.includes('window') || name.includes('door') || name.includes('crack') || name.includes('ฝ้า') || name.includes('เพดาน') || name.includes('ผนัง') || name.includes('พื้น') || name.includes('หน้าต่าง') || name.includes('ประตู') || name.includes('รอยร้าว') || name.includes('รั่ว')) {
    if (name.includes('ceiling') || name.includes('roof') || name.includes('ฝ้า') || name.includes('เพดาน') || name.includes('รั่ว')) {
      return {
        detectedObject: 'ฝ้าเพดานรั่วซึม',
        category: 'structural',
        title: 'ซ่อมแซมฝ้าเพดานรั่วซึม',
        description: 'พบรอยรั่วซึมจากเพดานห้องพัก มีน้ำหยดลงมาด้านล่าง'
      };
    }
    return {
      detectedObject: 'โครงสร้างห้องพัก / ประตูหน้าต่าง',
      category: 'structural',
      title: 'ซ่อมแซมบำรุงโครงสร้างห้องพัก',
      description: 'บานประตู หน้าต่างชำรุดปิดไม่สนิท หรือมีรอยร้าวบริเวณผนังและพื้นห้อง'
    };
  }

  // 4. Furniture (เฟอร์นิเจอร์)
  if (name.includes('chair') || name.includes('table') || name.includes('bed') || name.includes('desk') || name.includes('cabinet') || name.includes('wardrobe') || name.includes('furniture') || name.includes('เก้าอี้') || name.includes('โต๊ะ') || name.includes('เตียง') || name.includes('ตู้') || name.includes('เฟอร์นิเจอร์')) {
    return {
      detectedObject: 'เฟอร์นิเจอร์ชำรุด',
      category: 'furniture',
      title: 'ซ่อมแซมเฟอร์นิเจอร์ในห้องพัก',
      description: 'ตู้เสื้อผ้า โต๊ะทำงาน เก้าอี้ หรือเตียงนอนชำรุดเสียหาย'
    };
  }

  // 5. Appliance (เครื่องใช้ไฟฟ้า)
  if (name.includes('air') || name.includes('ac') || name.includes('fan') || name.includes('fridge') || name.includes('refrigerator') || name.includes('microwave') || name.includes('tv') || name.includes('appliance') || name.includes('แอร์') || name.includes('พัดลม') || name.includes('ตู้เย็น') || name.includes('ไมโครเวฟ') || name.includes('ทีวี')) {
    return {
      detectedObject: 'เครื่องปรับอากาศ / เครื่องใช้ไฟฟ้า',
      category: 'appliance',
      title: 'ซ่อมแซมเครื่องใช้ไฟฟ้าชำรุด',
      description: 'เครื่องปรับอากาศไม่เย็น พัดลมไม่หมุน หรือเครื่องใช้ไฟฟ้าอื่นมีปัญหา'
    };
  }

  return {
    detectedObject: 'อุปกรณ์ทั่วไปชำรุด',
    category: 'other',
    title: 'แจ้งซ่อมอุปกรณ์ทั่วไป',
    description: 'พบปัญหารายการชำรุดเสียหายในห้องพัก ต้องการให้ช่างเข้าตรวจสอบรายละเอียดเพิ่มเติม'
  };
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
      // Call Gemini 1.5 Flash API using v1 stable
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "You are an expert facility management AI. Analyze this image of an object in a dormitory room that needs repair. Identify the main object in the image in Thai (e.g., 'หลอดไฟ', 'ก๊อกน้ำอ่างล้างหน้า', 'บานพับตู้เสื้อผ้า'). If the damage is not clearly visible, just identify the object itself. Select the most appropriate category STRICTLY from this list: ['plumbing', 'electrical', 'furniture', 'appliance', 'structural', 'other']. Suggest a clear, concise Thai title for the repair ticket (e.g. 'แจ้งซ่อมหลอดไฟ'). Write a short Thai description based on what the object is, mentioning that it needs inspection or repair. Do not invent or hallucinate damages (like water leaks) if you don't clearly see them. Return the result strictly in JSON format as: { \"detectedObject\": \"...\", \"category\": \"...\", \"title\": \"...\", \"description\": \"...\" } without any markdown backticks or other text."
                },
                {
                  inlineData: {
                    mimeType: req.file.mimetype,
                    data: base64Image
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to analyze image with Gemini API');
      }

      const textResult = data.candidates[0].content.parts[0].text;
      const jsonResult = JSON.parse(textResult);

      // Clean up uploaded temp file
      try {
        fs.unlinkSync(imagePath);
      } catch (e) {
        console.error('Failed to delete temp AI analysis image file:', e);
      }

      res.json(jsonResult);
    } catch (apiErr) {
      console.warn('Gemini API failed, falling back to keyword heuristic analysis:', apiErr.message);
      
      const fallbackResult = analyzeDormProblem(req.file.originalname);
      
      // Clean up uploaded temp file
      try {
        fs.unlinkSync(imagePath);
      } catch (e) {
        console.error('Failed to delete temp AI analysis image file:', e);
      }

      res.json(fallbackResult);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Error analyzing image' });
  }
});


// Update repair status (Admin can set any, Resident can only set to 'cancelled' for their own request)
app.put('/api/repairs/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, technicianId, scheduledTime } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const repair = await dbGet('SELECT * FROM repairs WHERE id = ?', [id]);
    if (!repair) {
      return res.status(404).json({ error: 'Repair request not found.' });
    }

    // Authorization check:
    if (req.user.role !== 'admin' && req.user.role !== 'technician') {
      // Resident is trying to update
      if (repair.userId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied. You cannot modify other residents\' requests.' });
      }
      if (status !== 'cancelled') {
        return res.status(400).json({ error: 'Residents can only cancel their own repair requests.' });
      }
      if (repair.status !== 'pending' && repair.status !== 'in_progress') {
        return res.status(400).json({ error: 'Cannot cancel a request that is already completed or cancelled.' });
      }
    }

    // For residents, we append a small cancellation note.
    const finalAdminNotes = (req.user.role === 'admin' || req.user.role === 'technician')
      ? (adminNotes !== undefined ? adminNotes : repair.adminNotes) 
      : (repair.adminNotes ? `${repair.adminNotes} (ยกเลิกโดยผู้แจ้ง)` : 'ยกเลิกโดยผู้แจ้ง');

    let finalTechnicianId = repair.technicianId;
    let finalScheduledTime = repair.scheduledTime;

    if (req.user.role === 'admin' || req.user.role === 'technician') {
      if (technicianId !== undefined) finalTechnicianId = technicianId || null;
      if (scheduledTime !== undefined) finalScheduledTime = scheduledTime || null;
    }

    await dbRun(
      `UPDATE repairs 
       SET status = ?, adminNotes = ?, technicianId = ?, scheduledTime = ?, updatedAt = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [status, finalAdminNotes, finalTechnicianId, finalScheduledTime, id]
    );

    const updatedRepair = await dbGet('SELECT * FROM repairs WHERE id = ?', [id]);

    res.json({
      message: 'Repair status updated successfully.',
      repair: updatedRepair
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Delete all repair requests (Admin only)
app.delete('/api/repairs', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only admins can clear all repair requests.' });
    }

    await dbRun('DELETE FROM technician_schedules WHERE repairId IS NOT NULL');
    await dbRun('DELETE FROM repairs');
    res.json({ message: 'All repair requests and their schedules cleared successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Delete a specific repair request (Admin only)
app.delete('/api/repairs/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only admins can delete individual requests.' });
    }

    const { id } = req.params;
    const repair = await dbGet('SELECT * FROM repairs WHERE id = ?', [id]);
    if (!repair) {
      return res.status(404).json({ error: 'Repair request not found.' });
    }

    await dbRun('DELETE FROM technician_schedules WHERE repairId = ?', [id]);
    await dbRun('DELETE FROM repairs WHERE id = ?', [id]);
    res.json({ message: `Repair request #${id} deleted successfully.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});



// --- TECHNICIANS & SCHEDULES ---
app.get('/api/technicians', authenticateToken, async (req, res) => {
  try {
    const technicians = await dbAll('SELECT id, username, fullName, avatarUrl FROM users WHERE role = "technician"');
    res.json(technicians);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/technicians/schedule', authenticateToken, async (req, res) => {
  try {
    const schedules = await dbAll(`
      SELECT s.*, u.fullName as technicianName, r.status as repairStatus
      FROM technician_schedules s
      JOIN users u ON s.technicianId = u.id
      LEFT JOIN repairs r ON s.repairId = r.id
      ORDER BY s.startTime ASC
    `);
    res.json(schedules);
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

    const result = await dbRun(
      'INSERT INTO technician_schedules (technicianId, title, startTime, endTime, repairId) VALUES (?, ?, ?, ?, ?)',
      [targetTechId, title, startTime, endTime, repairId || null]
    );
    res.status(201).json({ message: 'Schedule added successfully.', id: result.id });
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
    
    // Total requests
    const { total } = await dbGet('SELECT COUNT(*) as total FROM repairs');
    
    // Status counts
    const statusCounts = await dbAll('SELECT status, COUNT(*) as count FROM repairs GROUP BY status');
    
    // Category counts
    const categoryCounts = await dbAll('SELECT category, COUNT(*) as count FROM repairs GROUP BY category');

    // Monthly totals for current year
    const monthlyCounts = await dbAll(`
      SELECT strftime('%m', createdAt) as month, COUNT(*) as count 
      FROM repairs 
      WHERE strftime('%Y', createdAt) = strftime('%Y', 'now') 
      GROUP BY month
    `);

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
    const users = await dbAll('SELECT id, username, fullName, userType, role, avatarUrl, createdAt FROM users ORDER BY createdAt DESC');
    res.json(users);
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
    const userId = req.params.id;

    await dbRun('UPDATE users SET fullName = ?, userType = ?, role = ? WHERE id = ?', [fullName, userType, role, userId]);
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
    const userId = req.params.id;
    if (userId == req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself.' });
    }
    await dbRun('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Catch-all route to serve the React frontend app
app.get('*', (req, res) => {
  // If request is for an API or uploads route that wasn't found, return 404 JSON instead of HTML
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
