const { Redis } = require('@upstash/redis');
const bcrypt = require('bcryptjs');

// Connect to Upstash Redis
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

let _dbReadyPromise = null;

// Helpers to read/write JSON arrays from Redis
async function getTable(key) {
  try {
    const data = await redis.get(key);
    // Upstash Redis parses JSON automatically
    if (!data) return [];
    return Array.isArray(data) ? data : [data];
  } catch (err) {
    console.error(`Error reading ${key} from Redis:`, err);
    return [];
  }
}

async function setTable(key, data) {
  try {
    await redis.set(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving ${key} to Redis:`, err);
  }
}

// Emulate auto-increment
async function getNextId(table) {
  try {
    return await redis.incr(`${table}_id_seq`);
  } catch (err) {
    console.error(`Error incrementing ID for ${table}:`, err);
    return Date.now(); // Fallback to timestamp
  }
}

async function initializeDatabase() {
  try {
    if (!process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL) {
      console.warn("WARNING: Redis URL is not set in environment variables!");
    } else {
      // Test ping
      await redis.ping();
    }

    // Check if seeded
    const users = await getTable('users');
    
    if (users.length === 0) {
      console.log('Seeding initial data to Redis...');
      const salt = await bcrypt.genSalt(10);
      const adminHash = await bcrypt.hash('12345', salt);
      const user1Hash = await bcrypt.hash('user123', salt);
      const user2Hash = await bcrypt.hash('user123', salt);
      const tech1Hash = await bcrypt.hash('tech123', salt);
      const exec1Hash = await bcrypt.hash('exec123', salt);

      const adminId = await getNextId('users');
      const user1Id = await getNextId('users');
      const user2Id = await getNextId('users');
      const tech1Id = await getNextId('users');
      const exec1Id = await getNextId('users');

      const initialUsers = [
        { id: adminId, username: 'admin', password: adminHash, fullName: 'ผู้ดูแล หอพัก (Admin)', roomNumber: null, role: 'admin', createdAt: new Date().toISOString() },
        { id: user1Id, username: 'user1', password: user1Hash, fullName: 'สมชาย รักดี', roomNumber: '301', role: 'resident', createdAt: new Date().toISOString() },
        { id: user2Id, username: 'user2', password: user2Hash, fullName: 'สมหญิง เรียนดี', roomNumber: '405', role: 'resident', createdAt: new Date().toISOString() },
        { id: tech1Id, username: 'tech1', password: tech1Hash, fullName: 'ช่างสมศักดิ์ ประชาดี (ไฟฟ้า)', roomNumber: null, role: 'technician', createdAt: new Date().toISOString() },
        { id: exec1Id, username: 'exec1', password: exec1Hash, fullName: 'ผู้บริหารระดับสูง (Executive)', roomNumber: null, role: 'executive', createdAt: new Date().toISOString() }
      ];
      await setTable('users', initialUsers);

      const repair1Id = await getNextId('repairs');
      const repair2Id = await getNextId('repairs');
      const repair3Id = await getNextId('repairs');
      const repair4Id = await getNextId('repairs');

      const initialRepairs = [
        { id: repair1Id, userId: user1Id, title: 'ก๊อกน้ำรั่วในห้องน้ำ', description: 'มีน้ำหยดออกมาริมขอบก๊อกตลอดเวลา หมุนปิดสนิทแล้วก็ยังหยด', category: 'plumbing', roomNumber: '301', detectedObject: 'faucet', status: 'pending', adminNotes: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: repair2Id, userId: user1Id, title: 'หลอดไฟไฟกระพริบ', description: 'หลอดไฟนีออนตรงกลางห้องนอนเปิดแล้วกระพริบถี่ๆ และมีเสียงดังหึ่งๆ', category: 'electrical', roomNumber: '301', detectedObject: 'light bulb', status: 'in_progress', adminNotes: 'รับเรื่องแล้ว กำลังเบิกอะไหล่หลอดไฟชุดใหม่', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: repair3Id, userId: user2Id, title: 'บานพับตู้เสื้อผ้าชำรุด', description: 'ตู้เสื้อผ้าไม้บานขวา หลุดออกจากบานพับ ทำให้ปิดตู้ไม่ได้เลย', category: 'furniture', roomNumber: '405', detectedObject: 'wardrobe / door hinge', status: 'completed', adminNotes: 'ดำเนินการเปลี่ยนบานพับและขันสกรูยึดใหม่เรียบร้อยแล้วเมื่อช่วงบ่าย', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: repair4Id, userId: user2Id, title: 'เครื่องปรับอากาศไม่เย็น', description: 'เปิดแอร์อุณหภูมิ 23 องศาแล้ว แต่มีแค่ลมร้อนออกมา ไม่มีลมเย็นเลย', category: 'appliance', roomNumber: '405', detectedObject: 'air conditioner', status: 'pending', adminNotes: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ];
      await setTable('repairs', initialRepairs);
      await setTable('technician_schedules', []);

      console.log('Seeding complete.');
    }
    
    console.log('Redis Database initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize Redis:', err);
    throw err;
  }
}

function getDbReady() {
  if (!_dbReadyPromise) {
    _dbReadyPromise = initializeDatabase();
  }
  return _dbReadyPromise;
}

// Start initialization immediately
getDbReady().catch(console.error);

module.exports = { getDbReady, getTable, setTable, getNextId };
