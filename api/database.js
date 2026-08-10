const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

let pool = null;
let _dbReadyPromise = null;

// Connect to Vercel Postgres or local Postgres
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

async function initializeDatabase() {
  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Create Users table
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      "fullName" TEXT NOT NULL,
      "roomNumber" TEXT,
      role TEXT CHECK(role IN ('resident', 'admin', 'technician', 'executive')) NOT NULL,
      "userType" TEXT,
      "avatarUrl" TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. Create Repairs table
    await pool.query(`CREATE TABLE IF NOT EXISTS repairs (
      id SERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT CHECK(category IN ('plumbing', 'electrical', 'furniture', 'appliance', 'structural', 'other')) NOT NULL,
      "roomNumber" TEXT NOT NULL,
      "imageUrl" TEXT,
      "detectedObject" TEXT,
      status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
      "adminNotes" TEXT,
      "technicianId" INTEGER,
      "scheduledTime" TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES users(id),
      FOREIGN KEY ("technicianId") REFERENCES users(id)
    )`);

    // 3. Create Technician Schedules table
    await pool.query(`CREATE TABLE IF NOT EXISTS technician_schedules (
      id SERIAL PRIMARY KEY,
      "technicianId" INTEGER NOT NULL,
      title TEXT NOT NULL,
      "startTime" TIMESTAMP NOT NULL,
      "endTime" TIMESTAMP NOT NULL,
      "repairId" INTEGER,
      FOREIGN KEY ("technicianId") REFERENCES users(id)
    )`);

    // 4. Seed Data if table is empty
    const countResult = await pool.query("SELECT COUNT(*) as count FROM users");
    const userCount = parseInt(countResult.rows[0].count, 10);

    if (userCount === 0) {
      console.log('Seeding initial users...');
      const salt = await bcrypt.genSalt(10);
      const adminHash = await bcrypt.hash('12345', salt);
      const user1Hash = await bcrypt.hash('user123', salt);
      const user2Hash = await bcrypt.hash('user123', salt);
      const tech1Hash = await bcrypt.hash('tech123', salt);
      const exec1Hash = await bcrypt.hash('exec123', salt);

      await pool.query(`INSERT INTO users (username, password, "fullName", "roomNumber", role) VALUES ($1, $2, $3, $4, $5)`,
        ['admin', adminHash, 'ผู้ดูแล หอพัก (Admin)', null, 'admin']);
      
      const resUser1 = await pool.query(`INSERT INTO users (username, password, "fullName", "roomNumber", role) VALUES ($1, $2, $3, $4, $5) RETURNING id, "roomNumber"`,
        ['user1', user1Hash, 'สมชาย รักดี', '301', 'resident']);
      
      const resUser2 = await pool.query(`INSERT INTO users (username, password, "fullName", "roomNumber", role) VALUES ($1, $2, $3, $4, $5) RETURNING id, "roomNumber"`,
        ['user2', user2Hash, 'สมหญิง เรียนดี', '405', 'resident']);
      
      await pool.query(`INSERT INTO users (username, password, "fullName", "roomNumber", role) VALUES ($1, $2, $3, $4, $5)`,
        ['tech1', tech1Hash, 'ช่างสมศักดิ์ ประชาดี (ไฟฟ้า)', null, 'technician']);
      
      await pool.query(`INSERT INTO users (username, password, "fullName", "roomNumber", role) VALUES ($1, $2, $3, $4, $5)`,
        ['exec1', exec1Hash, 'ผู้บริหารระดับสูง (Executive)', null, 'executive']);

      // Seed Repairs
      const user1 = resUser1.rows[0];
      const user2 = resUser2.rows[0];

      if (user1) {
        await pool.query(`INSERT INTO repairs ("userId", title, description, category, "roomNumber", "detectedObject", status, "adminNotes") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [user1.id, 'ก๊อกน้ำรั่วในห้องน้ำ', 'มีน้ำหยดออกมาริมขอบก๊อกตลอดเวลา หมุนปิดสนิทแล้วก็ยังหยด', 'plumbing', user1.roomNumber, 'faucet', 'pending', null]);
        await pool.query(`INSERT INTO repairs ("userId", title, description, category, "roomNumber", "detectedObject", status, "adminNotes") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [user1.id, 'หลอดไฟไฟกระพริบ', 'หลอดไฟนีออนตรงกลางห้องนอนเปิดแล้วกระพริบถี่ๆ และมีเสียงดังหึ่งๆ', 'electrical', user1.roomNumber, 'light bulb', 'in_progress', 'รับเรื่องแล้ว กำลังเบิกอะไหล่หลอดไฟชุดใหม่']);
      }

      if (user2) {
        await pool.query(`INSERT INTO repairs ("userId", title, description, category, "roomNumber", "detectedObject", status, "adminNotes") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [user2.id, 'บานพับตู้เสื้อผ้าชำรุด', 'ตู้เสื้อผ้าไม้บานขวา หลุดออกจากบานพับ ทำให้ปิดตู้ไม่ได้เลย', 'furniture', user2.roomNumber, 'wardrobe / door hinge', 'completed', 'ดำเนินการเปลี่ยนบานพับและขันสกรูยึดใหม่เรียบร้อยแล้วเมื่อช่วงบ่าย']);
        await pool.query(`INSERT INTO repairs ("userId", title, description, category, "roomNumber", "detectedObject", status, "adminNotes") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [user2.id, 'เครื่องปรับอากาศไม่เย็น', 'เปิดแอร์อุณหภูมิ 23 องศาแล้ว แต่มีแค่ลมร้อนออกมา ไม่มีลมเย็นเลย', 'appliance', user2.roomNumber, 'air conditioner', 'pending', null]);
      }

      console.log('Seeding complete.');
    }

    console.log('Database initialized successfully.');
    return pool;
  } catch (err) {
    console.error('Failed to initialize database:', err);
    throw err;
  }
}

function saveDatabase() {
  // No-op for Postgres
}

function getDb() {
  return pool;
}

function getDbReady() {
  if (!_dbReadyPromise) {
    _dbReadyPromise = initializeDatabase();
  }
  return _dbReadyPromise;
}

// Start initialization immediately
getDbReady().catch(console.error);

module.exports = { getDb, getDbReady, saveDatabase };
