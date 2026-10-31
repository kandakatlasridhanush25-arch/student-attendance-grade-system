const mysql = require('mysql2/promise');

const useSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';
const ca = process.env.DB_CA ? process.env.DB_CA.replace(/\\n/g, '\n') : null;

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'attendance_grade_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  dateStrings: true,
  ...(useSsl ? {
    ssl: ca
      ? { ca, rejectUnauthorized: true, minVersion: 'TLSv1.2' }
      : { rejectUnauthorized: false, minVersion: 'TLSv1.2' }
  } : {})
});

module.exports = pool;
