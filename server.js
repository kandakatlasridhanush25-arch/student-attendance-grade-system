require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const pool = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

app.use(session({
  name: 'attendancePortal.sid',
  secret: process.env.SESSION_SECRET || 'local-demo-secret-change-me-before-deployment',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 2 * 60 * 60 * 1000
  }
}));

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' }
});

function requireLogin(req, res, next) {
  if (!req.session.portalUser) return res.status(401).json({ error: 'Please sign in first.' });
  next();
}

function publicRole(role) {
  return ({ ADMIN: 'Admin', FACULTY: 'Faculty', STUDENT: 'Student' })[role] || 'User';
}

async function buildPublicUser(account) {
  let name = 'Project Admin';
  if (account.role === 'FACULTY') {
    const [rows] = await pool.execute('SELECT faculty_name AS name FROM faculty WHERE faculty_id = ?', [account.faculty_id]);
    name = rows[0]?.name || 'Faculty User';
  } else if (account.role === 'STUDENT') {
    const [rows] = await pool.execute('SELECT full_name AS name FROM students WHERE student_id = ?', [account.student_id]);
    name = rows[0]?.name || 'Student User';
  }
  return {
    accountId: account.account_id,
    username: account.username,
    role: publicRole(account.role),
    name,
    studentId: account.student_id == null ? null : Number(account.student_id),
    facultyId: account.faculty_id == null ? null : Number(account.faculty_id)
  };
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: process.env.DB_NAME || 'attendance_grade_system' });
  } catch (error) {
    console.error('Health check database error:', error.message);
    res.status(503).json({ ok: false, error: 'The MySQL connection is not available.' });
  }
});

app.post('/api/auth/login', loginLimiter, async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!username || !password || username.length > 60 || password.length > 200) {
      return res.status(400).json({ error: 'Enter a valid username and password.' });
    }

    const [rows] = await pool.execute(
      `SELECT account_id, username, password_hash, role, student_id, faculty_id
       FROM website_accounts WHERE username = ? AND active = TRUE LIMIT 1`,
      [username]
    );
    const account = rows[0];
    if (!account || !(await bcrypt.compare(password, account.password_hash))) {
      return res.status(401).json({ error: 'Login not recognised. Check your demo username and password.' });
    }

    req.session.regenerate(async (sessionError) => {
      if (sessionError) return next(sessionError);
      try {
        const user = await buildPublicUser(account);
        req.session.portalUser = {
          accountId: user.accountId,
          username: user.username,
          role: account.role,
          studentId: user.studentId,
          facultyId: user.facultyId,
          name: user.name
        };
        res.json({ user });
      } catch (error) { next(error); }
    });
  } catch (error) { next(error); }
});

app.get('/api/auth/me', async (req, res, next) => {
  try {
    if (!req.session.portalUser) return res.status(401).json({ error: 'Not signed in.' });
    const account = req.session.portalUser;
    res.json({ user: {
      accountId: account.accountId,
      username: account.username,
      role: publicRole(account.role),
      name: account.name,
      studentId: account.studentId,
      facultyId: account.facultyId
    } });
  } catch (error) { next(error); }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) return res.status(500).json({ error: 'Could not sign out cleanly.' });
    res.clearCookie('attendancePortal.sid', { httpOnly: true, sameSite: 'lax', secure: isProduction });
    res.json({ ok: true });
  });
});

app.get('/api/data', requireLogin, async (req, res, next) => {
  try {
    const user = req.session.portalUser;
    const role = user.role;
    const studentId = user.studentId;
    const facultyId = user.facultyId;

    const [deptRows] = await pool.query('SELECT dept_id, dept_name FROM departments ORDER BY dept_id');
    const deptShort = (name) => /computer science/i.test(name) ? 'CSE' : /information technology/i.test(name) ? 'IT' : /electronics/i.test(name) ? 'ECE' : name.slice(0, 3).toUpperCase();
    const departments = deptRows.map((r) => ({ id: Number(r.dept_id), name: r.dept_name, short: deptShort(r.dept_name) }));

    const [facultyRows] = await pool.query('SELECT faculty_id, faculty_name, email, dept_id FROM faculty ORDER BY faculty_id');
    const faculty = facultyRows.map((r) => ({ id: Number(r.faculty_id), name: r.faculty_name, email: r.email, dept: Number(r.dept_id) }));

    let studentSql = `SELECT DISTINCT s.student_id AS id, s.roll_no AS roll, s.full_name AS name,
                      s.email, s.dept_id AS dept, s.semester, s.status
                      FROM students s`;
    const studentParams = [];
    if (role === 'STUDENT') {
      studentSql += ' WHERE s.student_id = ?';
      studentParams.push(studentId);
    } else if (role === 'FACULTY') {
      studentSql += ` JOIN enrollments e ON e.student_id = s.student_id
                     JOIN subjects fs ON fs.subject_id = e.subject_id
                     WHERE fs.faculty_id = ? AND e.enrollment_status = 'Enrolled'`;
      studentParams.push(facultyId);
    }
    studentSql += ' ORDER BY s.roll_no';
    const [studentRows] = await pool.execute(studentSql, studentParams);
    const students = studentRows.map((r) => ({ id: Number(r.id), roll: r.roll, name: r.name, email: r.email, dept: Number(r.dept), semester: Number(r.semester), status: r.status }));

    let subjectSql = `SELECT DISTINCT s.subject_id AS id, s.subject_code AS code, s.subject_name AS name,
                      s.credits, s.semester, s.dept_id AS dept, s.faculty_id AS faculty
                      FROM subjects s`;
    const subjectParams = [];
    if (role === 'FACULTY') {
      subjectSql += ' WHERE s.faculty_id = ?';
      subjectParams.push(facultyId);
    } else if (role === 'STUDENT') {
      subjectSql += ` JOIN enrollments e ON e.subject_id = s.subject_id
                     WHERE e.student_id = ? AND e.enrollment_status = 'Enrolled'`;
      subjectParams.push(studentId);
    }
    subjectSql += ' ORDER BY s.subject_code';
    const [subjectRows] = await pool.execute(subjectSql, subjectParams);
    const subjects = subjectRows.map((r) => ({ id: Number(r.id), code: r.code, name: r.name, credits: Number(r.credits), semester: Number(r.semester), dept: Number(r.dept), faculty: Number(r.faculty) }));

    let attendanceSql = `SELECT v.student_id AS studentId, v.subject_id AS subjectId,
                         v.total_classes AS total, v.attended_classes AS attended,
                         v.attendance_percentage AS percentage
                         FROM vw_student_attendance_summary v`;
    const attendanceParams = [];
    if (role === 'STUDENT') {
      attendanceSql += ' WHERE v.student_id = ?';
      attendanceParams.push(studentId);
    } else if (role === 'FACULTY') {
      attendanceSql += ' WHERE EXISTS (SELECT 1 FROM subjects fsub WHERE fsub.subject_id = v.subject_id AND fsub.faculty_id = ?)';
      attendanceParams.push(facultyId);
    }
    attendanceSql += ' ORDER BY v.roll_no, v.subject_code';
    const [attendanceResult] = await pool.execute(attendanceSql, attendanceParams);
    const attendanceRows = attendanceResult.map((r) => ({ studentId: Number(r.studentId), subjectId: Number(r.subjectId), total: Number(r.total || 0), attended: Number(r.attended || 0), percentage: Number(r.percentage || 0) }));

    let gradeSql = `SELECT g.student_id AS studentId, g.subject_id AS subjectId,
                    g.total_marks AS total, g.total_max_marks AS max,
                    g.percentage, g.grade
                    FROM vw_student_grade_report g`;
    const gradeParams = [];
    if (role === 'STUDENT') {
      gradeSql += ' WHERE g.student_id = ?';
      gradeParams.push(studentId);
    } else if (role === 'FACULTY') {
      gradeSql += ' WHERE EXISTS (SELECT 1 FROM subjects fsub WHERE fsub.subject_id = g.subject_id AND fsub.faculty_id = ?)';
      gradeParams.push(facultyId);
    }
    gradeSql += ' ORDER BY g.roll_no, g.subject_code';
    const [gradeResult] = await pool.execute(gradeSql, gradeParams);
    const gradeRows = gradeResult.map((r) => ({ studentId: Number(r.studentId), subjectId: Number(r.subjectId), total: Number(r.total || 0), max: Number(r.max || 0), percentage: Number(r.percentage || 0), grade: r.grade }));

    let performanceSql = `SELECT s.subject_id AS subjectId, p.subject_code AS code,
                          p.subject_name AS name, p.average_assessment_percentage AS average,
                          p.students_assessed AS assessed
                          FROM vw_subject_performance p JOIN subjects s ON s.subject_code = p.subject_code`;
    const performanceParams = [];
    if (role === 'FACULTY') {
      performanceSql += ' WHERE s.faculty_id = ?';
      performanceParams.push(facultyId);
    } else if (role === 'STUDENT') {
      performanceSql += ` WHERE EXISTS (SELECT 1 FROM enrollments e WHERE e.subject_id = s.subject_id AND e.student_id = ? AND e.enrollment_status = 'Enrolled')`;
      performanceParams.push(studentId);
    }
    performanceSql += ' ORDER BY p.subject_code';
    const [performanceResult] = await pool.execute(performanceSql, performanceParams);
    const subjectPerformance = performanceResult.map((r) => ({ subjectId: Number(r.subjectId), code: r.code, name: r.name, average: Number(r.average || 0), assessed: Number(r.assessed || 0) }));

    let enrollmentSql = `SELECT COUNT(*) AS total FROM enrollments e`;
    const enrollmentParams = [];
    if (role === 'STUDENT') {
      enrollmentSql += ` WHERE e.student_id = ? AND e.enrollment_status = 'Enrolled'`;
      enrollmentParams.push(studentId);
    } else if (role === 'FACULTY') {
      enrollmentSql += ` JOIN subjects s ON s.subject_id = e.subject_id WHERE s.faculty_id = ? AND e.enrollment_status = 'Enrolled'`;
      enrollmentParams.push(facultyId);
    }
    const [[enrollmentCount]] = await pool.execute(enrollmentSql, enrollmentParams);

    const warnings = attendanceRows.filter((r) => r.total > 0 && r.percentage < 75).length;
    const publicUser = {
      accountId: user.accountId, username: user.username, role: publicRole(role),
      name: user.name, studentId: studentId == null ? null : Number(studentId),
      facultyId: facultyId == null ? null : Number(facultyId)
    };

    res.json({
      user: publicUser,
      summary: { students: students.length, subjects: subjects.length, enrollments: Number(enrollmentCount.total || 0), openWarnings: warnings },
      departments, students, faculty, subjects, attendanceRows, gradeRows, subjectPerformance
    });
  } catch (error) { next(error); }
});

// Write access is limited to administrator/faculty accounts. Students remain read-only.
function requireRecordWriter(req, res, next) {
  const role = req.session.portalUser?.role;
  if (!role) return res.status(401).json({ error: 'Please sign in first.' });
  if (!['ADMIN', 'FACULTY'].includes(role)) {
    return res.status(403).json({ error: 'Only administrator or faculty accounts can record attendance or marks.' });
  }
  next();
}

async function getAcademicUserId(user) {
  let rows;
  if (user.role === 'ADMIN') {
    [rows] = await pool.execute("SELECT user_id FROM users WHERE role = 'ADMIN' ORDER BY user_id LIMIT 1");
  } else if (user.role === 'FACULTY' && user.facultyId != null) {
    [rows] = await pool.execute("SELECT user_id FROM users WHERE role = 'FACULTY' AND faculty_id = ? ORDER BY user_id LIMIT 1", [user.facultyId]);
  } else {
    rows = [];
  }
  if (!rows.length) {
    const error = new Error('No matching administrator/faculty record exists in the project users table. Ask the project administrator to check the users table.');
    error.statusCode = 409;
    throw error;
  }
  return Number(rows[0].user_id);
}

async function validateRecordScope(user, studentId, subjectId) {
  const [enrolments] = await pool.execute(
    `SELECT e.enrollment_id FROM enrollments e
     WHERE e.student_id = ? AND e.subject_id = ? AND e.enrollment_status = 'Enrolled' LIMIT 1`,
    [studentId, subjectId]
  );
  if (!enrolments.length) {
    const error = new Error('This student is not currently enrolled in the selected subject.');
    error.statusCode = 400;
    throw error;
  }
  if (user.role === 'FACULTY') {
    const [assignments] = await pool.execute(
      'SELECT subject_id FROM subjects WHERE subject_id = ? AND faculty_id = ? LIMIT 1',
      [subjectId, user.facultyId]
    );
    if (!assignments.length) {
      const error = new Error('You can only record information for subjects assigned to your faculty account.');
      error.statusCode = 403;
      throw error;
    }
  }
}

app.post('/api/attendance', requireLogin, requireRecordWriter, async (req, res, next) => {
  try {
    const studentId = Number(req.body.studentId);
    const subjectId = Number(req.body.subjectId);
    const periodNo = Number(req.body.periodNo);
    const attendanceDate = String(req.body.attendanceDate || '').trim();
    const status = String(req.body.status || '').trim();
    const user = req.session.portalUser;
    const validStatuses = new Set(['Present', 'Absent', 'Late', 'Excused']);
    const dateParts = attendanceDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const validDate = Boolean(dateParts && (() => { const date = new Date(Date.UTC(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3]))); return date.getUTCFullYear() === Number(dateParts[1]) && date.getUTCMonth() === Number(dateParts[2]) - 1 && date.getUTCDate() === Number(dateParts[3]); })());

    if (!Number.isInteger(studentId) || studentId < 1 || !Number.isInteger(subjectId) || subjectId < 1) {
      return res.status(400).json({ error: 'Choose a valid student and subject.' });
    }
    if (!validDate) return res.status(400).json({ error: 'Enter a valid attendance date.' });
    if (!Number.isInteger(periodNo) || periodNo < 1 || periodNo > 12) {
      return res.status(400).json({ error: 'Period number must be between 1 and 12.' });
    }
    if (!validStatuses.has(status)) return res.status(400).json({ error: 'Choose Present, Absent, Late or Excused.' });

    await validateRecordScope(user, studentId, subjectId);
    const markedBy = await getAcademicUserId(user);
    await pool.query('CALL sp_mark_attendance(?, ?, ?, ?, ?, ?)', [studentId, subjectId, attendanceDate, periodNo, status, markedBy]);
    res.json({ ok: true, message: 'Attendance saved to MySQL. Repeated entries for the same student, subject, date and period update the existing record.' });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    if (error.sqlState === '45000' || error.code === 'ER_SIGNAL_EXCEPTION') {
      return res.status(400).json({ error: error.sqlMessage || error.message || 'MySQL rejected this attendance entry.' });
    }
    next(error);
  }
});

app.post('/api/marks', requireLogin, requireRecordWriter, async (req, res, next) => {
  try {
    const studentId = Number(req.body.studentId);
    const subjectId = Number(req.body.subjectId);
    const assessmentType = String(req.body.assessmentType || '').trim();
    const marksObtained = Number(req.body.marksObtained);
    const maxMarks = Number(req.body.maxMarks);
    const user = req.session.portalUser;
    const validAssessments = new Set(['Internal-1', 'Internal-2', 'Assignment', 'Practical', 'End-Sem']);

    if (!Number.isInteger(studentId) || studentId < 1 || !Number.isInteger(subjectId) || subjectId < 1) {
      return res.status(400).json({ error: 'Choose a valid student and subject.' });
    }
    if (!validAssessments.has(assessmentType)) return res.status(400).json({ error: 'Choose a valid assessment type.' });
    if (!Number.isFinite(marksObtained) || !Number.isFinite(maxMarks) || marksObtained < 0 || maxMarks <= 0 || marksObtained > maxMarks || maxMarks > 9999.99) {
      return res.status(400).json({ error: 'Marks must be non-negative, the maximum must be greater than zero, and obtained marks cannot exceed the maximum.' });
    }

    await validateRecordScope(user, studentId, subjectId);
    const enteredBy = await getAcademicUserId(user);
    await pool.query('CALL sp_enter_mark(?, ?, ?, ?, ?, ?)', [studentId, subjectId, assessmentType, marksObtained, maxMarks, enteredBy]);
    res.json({ ok: true, message: 'Marks saved to MySQL. Entering the same student, subject and assessment again updates the existing mark.' });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    if (error.sqlState === '45000' || error.code === 'ER_SIGNAL_EXCEPTION') {
      return res.status(400).json({ error: error.sqlMessage || error.message || 'MySQL rejected this mark entry.' });
    }
    next(error);
  }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));

app.use((error, _req, res, _next) => {
  console.error('Application error:', error.message);
  if (res.headersSent) return;
  res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'The request could not be completed. Check the server terminal and MySQL connection.' });
});

async function main() {
  try {
    await pool.query('SELECT 1');
    // Fail early with a helpful error if setup-demo.js has not been run yet.
    await pool.query('SELECT account_id FROM website_accounts LIMIT 1');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\nStudent Attendance Portal is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('\nThe portal could not start.');
    console.error('1. Make sure MySQL Server is running.');
    console.error('2. Check DB_PASSWORD and DB_NAME in your .env file.');
    console.error('3. Run: npm run setup-demo');
    console.error('Details:', error.message);
    await pool.end();
    process.exit(1);
  }
}

main();
