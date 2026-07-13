const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let db = null;
let _dbReadyPromise = null;

const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const dbPath = isVercel
  ? path.join('/tmp', 'database.sqlite')
  : path.resolve(__dirname, 'database.sqlite');

async function initializeDatabase() {
  const SQL = await initSqlJs();

  // Try loading existing database file
  try {
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
      console.log('Loaded existing SQLite database.');
    } else {
      db = new SQL.Database();
      console.log('Created new SQLite database.');
    }
  } catch (e) {
    db = new SQL.Database();
    console.log('Created new in-memory SQLite database.');
  }

  // 1. Create Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    fullName TEXT NOT NULL,
    roomNumber TEXT,
    role TEXT CHECK(role IN ('resident', 'admin', 'technician', 'executive')) NOT NULL,
    avatarUrl TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 2. Create Repairs table
  db.run(`CREATE TABLE IF NOT EXISTS repairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT CHECK(category IN ('plumbing', 'electrical', 'furniture', 'appliance', 'structural', 'other')) NOT NULL,
    roomNumber TEXT NOT NULL,
    imageUrl TEXT,
    detectedObject TEXT,
    status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    adminNotes TEXT,
    technicianId INTEGER,
    scheduledTime TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (technicianId) REFERENCES users(id)
  )`);

  // 3. Create Technician Schedules table
  db.run(`CREATE TABLE IF NOT EXISTS technician_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    technicianId INTEGER NOT NULL,
    title TEXT NOT NULL,
    startTime DATETIME NOT NULL,
    endTime DATETIME NOT NULL,
    FOREIGN KEY (technicianId) REFERENCES users(id)
  )`);

  // 4. Seed Data if table is empty
  const countResult = db.exec("SELECT COUNT(*) as count FROM users");
  const userCount = countResult.length > 0 ? countResult[0].values[0][0] : 0;

  if (userCount === 0) {
    console.log('Seeding initial users...');
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('12345', salt);
    const user1Hash = await bcrypt.hash('user123', salt);
    const user2Hash = await bcrypt.hash('user123', salt);
    const tech1Hash = await bcrypt.hash('tech123', salt);
    const exec1Hash = await bcrypt.hash('exec123', salt);

    db.run(`INSERT INTO users (username, password, fullName, roomNumber, role) VALUES (?, ?, ?, ?, ?)`,
      ['admin', adminHash, 'ผู้ดูแล หอพัก (Admin)', null, 'admin']);
    db.run(`INSERT INTO users (username, password, fullName, roomNumber, role) VALUES (?, ?, ?, ?, ?)`,
      ['user1', user1Hash, 'สมชาย รักดี', '301', 'resident']);
    db.run(`INSERT INTO users (username, password, fullName, roomNumber, role) VALUES (?, ?, ?, ?, ?)`,
      ['user2', user2Hash, 'สมหญิง เรียนดี', '405', 'resident']);
    db.run(`INSERT INTO users (username, password, fullName, roomNumber, role) VALUES (?, ?, ?, ?, ?)`,
      ['tech1', tech1Hash, 'ช่างสมศักดิ์ ประชาดี (ไฟฟ้า)', null, 'technician']);
    db.run(`INSERT INTO users (username, password, fullName, roomNumber, role) VALUES (?, ?, ?, ?, ?)`,
      ['exec1', exec1Hash, 'ผู้บริหารระดับสูง (Executive)', null, 'executive']);

    // Seed Repairs
    const usersResult = db.exec("SELECT id, username, roomNumber FROM users WHERE role = 'resident'");
    if (usersResult.length > 0) {
      const columns = usersResult[0].columns;
      const rows = usersResult[0].values;
      const users = rows.map(row => {
        const obj = {};
        columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
      });

      const user1 = users.find(u => u.username === 'user1');
      const user2 = users.find(u => u.username === 'user2');

      if (user1) {
        db.run(`INSERT INTO repairs (userId, title, description, category, roomNumber, detectedObject, status, adminNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [user1.id, 'ก๊อกน้ำรั่วในห้องน้ำ', 'มีน้ำหยดออกมาริมขอบก๊อกตลอดเวลา หมุนปิดสนิทแล้วก็ยังหยด', 'plumbing', user1.roomNumber, 'faucet', 'pending', null]);
        db.run(`INSERT INTO repairs (userId, title, description, category, roomNumber, detectedObject, status, adminNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [user1.id, 'หลอดไฟไฟกระพริบ', 'หลอดไฟนีออนตรงกลางห้องนอนเปิดแล้วกระพริบถี่ๆ และมีเสียงดังหึ่งๆ', 'electrical', user1.roomNumber, 'light bulb', 'in_progress', 'รับเรื่องแล้ว กำลังเบิกอะไหล่หลอดไฟชุดใหม่']);
      }

      if (user2) {
        db.run(`INSERT INTO repairs (userId, title, description, category, roomNumber, detectedObject, status, adminNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [user2.id, 'บานพับตู้เสื้อผ้าชำรุด', 'ตู้เสื้อผ้าไม้บานขวา หลุดออกจากบานพับ ทำให้ปิดตู้ไม่ได้เลย', 'furniture', user2.roomNumber, 'wardrobe / door hinge', 'completed', 'ดำเนินการเปลี่ยนบานพับและขันสกรูยึดใหม่เรียบร้อยแล้วเมื่อช่วงบ่าย']);
        db.run(`INSERT INTO repairs (userId, title, description, category, roomNumber, detectedObject, status, adminNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [user2.id, 'เครื่องปรับอากาศไม่เย็น', 'เปิดแอร์อุณหภูมิ 23 องศาแล้ว แต่มีแค่ลมร้อนออกมา ไม่มีลมเย็นเลย', 'appliance', user2.roomNumber, 'air conditioner', 'pending', null]);
      }
    }

    console.log('Seeding complete.');
  }

  // Save database to file
  saveDatabase();
  console.log('Database initialized successfully.');
  return db;
}

function saveDatabase() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (e) {
    console.error('Error saving database:', e.message);
  }
}

function getDb() {
  return db;
}

function getDbReady() {
  if (!_dbReadyPromise) {
    _dbReadyPromise = initializeDatabase();
  }
  return _dbReadyPromise;
}

// Start initialization immediately
getDbReady();

module.exports = { getDb, getDbReady, saveDatabase };
