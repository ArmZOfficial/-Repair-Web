const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // 1. Create Users table
    // Roles: resident, admin, technician, executive
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
    // Added technicianId and scheduledTime
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
    db.get("SELECT COUNT(*) as count FROM users", [], async (err, row) => {
      if (err) {
        console.error('Error counting users', err.message);
        return;
      }
      
      if (row.count === 0) {
        console.log('Seeding initial users...');
        const salt = await bcrypt.genSalt(10);
        const adminHash = await bcrypt.hash('12345', salt);
        const user1Hash = await bcrypt.hash('user123', salt);
        const user2Hash = await bcrypt.hash('user123', salt);
        const tech1Hash = await bcrypt.hash('tech123', salt);
        const exec1Hash = await bcrypt.hash('exec123', salt);

        db.run(
          `INSERT INTO users (username, password, fullName, roomNumber, role) VALUES (?, ?, ?, ?, ?)`,
          ['admin', adminHash, 'ผู้ดูแล หอพัก (Admin)', null, 'admin']
        );
        db.run(
          `INSERT INTO users (username, password, fullName, roomNumber, role) VALUES (?, ?, ?, ?, ?)`,
          ['user1', user1Hash, 'สมชาย รักดี', '301', 'resident']
        );
        db.run(
          `INSERT INTO users (username, password, fullName, roomNumber, role) VALUES (?, ?, ?, ?, ?)`,
          ['user2', user2Hash, 'สมหญิง เรียนดี', '405', 'resident']
        );
        db.run(
          `INSERT INTO users (username, password, fullName, roomNumber, role) VALUES (?, ?, ?, ?, ?)`,
          ['tech1', tech1Hash, 'ช่างสมศักดิ์ ประชาดี (ไฟฟ้า)', null, 'technician']
        );
        db.run(
          `INSERT INTO users (username, password, fullName, roomNumber, role) VALUES (?, ?, ?, ?, ?)`,
          ['exec1', exec1Hash, 'ผู้บริหารระดับสูง (Executive)', null, 'executive'],
          () => {
            seedRepairs();
          }
        );
      }
    });
  });
}

function seedRepairs() {
  db.get("SELECT COUNT(*) as count FROM repairs", [], (err, row) => {
    if (err) {
      console.error('Error counting repairs', err.message);
      return;
    }

    if (row.count === 0) {
      console.log('Seeding initial repair requests...');
      
      db.all("SELECT id, username, roomNumber FROM users WHERE role = 'resident'", [], (err, users) => {
        if (err || !users || users.length === 0) return;

        const user1 = users.find(u => u.username === 'user1');
        const user2 = users.find(u => u.username === 'user2');

        if (user1) {
          db.run(
            `INSERT INTO repairs (userId, title, description, category, roomNumber, detectedObject, status, adminNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [user1.id, 'ก๊อกน้ำรั่วในห้องน้ำ', 'มีน้ำหยดออกมาริมขอบก๊อกตลอดเวลา หมุนปิดสนิทแล้วก็ยังหยด', 'plumbing', user1.roomNumber, 'faucet', 'pending', null]
          );

          db.run(
            `INSERT INTO repairs (userId, title, description, category, roomNumber, detectedObject, status, adminNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [user1.id, 'หลอดไฟไฟกระพริบ', 'หลอดไฟนีออนตรงกลางห้องนอนเปิดแล้วกระพริบถี่ๆ และมีเสียงดังหึ่งๆ', 'electrical', user1.roomNumber, 'light bulb', 'in_progress', 'รับเรื่องแล้ว กำลังเบิกอะไหล่หลอดไฟชุดใหม่']
          );
        }

        if (user2) {
          db.run(
            `INSERT INTO repairs (userId, title, description, category, roomNumber, detectedObject, status, adminNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [user2.id, 'บานพับตู้เสื้อผ้าชำรุด', 'ตู้เสื้อผ้าไม้บานขวา หลุดออกจากบานพับ ทำให้ปิดตู้ไม่ได้เลย', 'furniture', user2.roomNumber, 'wardrobe / door hinge', 'completed', 'ดำเนินการเปลี่ยนบานพับและขันสกรูยึดใหม่เรียบร้อยแล้วเมื่อช่วงบ่าย']
          );

          db.run(
            `INSERT INTO repairs (userId, title, description, category, roomNumber, detectedObject, status, adminNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [user2.id, 'เครื่องปรับอากาศไม่เย็น', 'เปิดแอร์อุณหภูมิ 23 องศาแล้ว แต่มีแค่ลมร้อนออกมา ไม่มีลมเย็นเลย', 'appliance', user2.roomNumber, 'air conditioner', 'pending', null]
          );
        }
      });
    }
  });
}

module.exports = db;
