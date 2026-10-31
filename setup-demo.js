require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

async function main() {
  const connection = await pool.getConnection();
  try {
    // Validate the existing project database and views before adding website logins.
    await connection.query('SELECT student_id FROM students LIMIT 1');
    await connection.query('SELECT * FROM vw_student_attendance_summary LIMIT 1');
    await connection.query('SELECT * FROM vw_student_grade_report LIMIT 1');
    await connection.query('SELECT * FROM vw_subject_performance LIMIT 1');

    // Separate website-login table. It deliberately has no CHECK/FK constraints:
    // account links are verified by the application and the existing project tables stay untouched.
    // This avoids the previous chk_portal_account_link / ON DELETE SET NULL constraint error.
    await connection.query(`
      CREATE TABLE IF NOT EXISTS website_accounts (
        account_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(60) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('ADMIN','FACULTY','STUDENT') NOT NULL,
        student_id INT NULL,
        faculty_id INT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    const [facultyRows] = await connection.query('SELECT faculty_id FROM faculty ORDER BY faculty_id LIMIT 1');
    const [studentRows] = await connection.query('SELECT student_id FROM students ORDER BY student_id LIMIT 1');
    if (!facultyRows.length || !studentRows.length) {
      throw new Error('No sample student or faculty was found. The existing database needs its project data loaded first. Do not run setup scripts unless you intend to rebuild the database.');
    }

    const accounts = [
      { username: 'admin', password: process.env.DEMO_ADMIN_PASSWORD || 'admin123', role: 'ADMIN', studentId: null, facultyId: null },
      { username: 'faculty', password: process.env.DEMO_FACULTY_PASSWORD || 'faculty123', role: 'FACULTY', studentId: null, facultyId: facultyRows[0].faculty_id },
      { username: 'student', password: process.env.DEMO_STUDENT_PASSWORD || 'student123', role: 'STUDENT', studentId: studentRows[0].student_id, facultyId: null }
    ];

    for (const account of accounts) {
      const passwordHash = await bcrypt.hash(account.password, 12);
      await connection.query(
        `INSERT INTO website_accounts (username, password_hash, role, student_id, faculty_id, active)
         VALUES (?, ?, ?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE
           password_hash = VALUES(password_hash), role = VALUES(role),
           student_id = VALUES(student_id), faculty_id = VALUES(faculty_id), active = TRUE`,
        [account.username, passwordHash, account.role, account.studentId, account.facultyId]
      );
    }

    console.log('\nSetup complete. Website login accounts are ready.');
    console.log('Admin: admin / admin123');
    console.log('Faculty: faculty / faculty123');
    console.log('Student: student / student123');
    console.log('Your existing departments, students, attendance, marks, views and other project objects were not dropped or recreated.');
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error('\nWEBSITE SETUP FAILED');
  console.error('Check that MySQL Server is running, the database exists, and DB_PASSWORD in .env is correct.');
  console.error('Details:', error.message);
  try { await pool.end(); } catch {}
  process.exit(1);
});
