# Student Attendance & Grade Management System — Backend Version

Beginner-friendly website for the B.Tech DBMS mini-project. It uses **Node.js + Express + MySQL**.

## What is now connected to MySQL?

- Website login is checked on the server, not by JavaScript alone.
- Passwords are hashed with bcrypt before being stored in a new `website_accounts` table.
- Admin, Faculty and Student demo accounts have different data visibility.
- Students, subjects, attendance summaries, grade reports and subject-performance reports come from the existing `attendance_grade_system` database.
- Attendance and grade data are read from the SQL views already created for the project.
- CSV exports are generated from the current database-backed results.
- The existing database is **not dropped, recreated or reset** by this backend setup.

The website pages are currently read-only. The login credentials are demo credentials for a college project, not for a real production system.

## What you need

1. MySQL Server and your existing `attendance_grade_system` database.
2. Node.js **24 LTS** (recommended) installed on Windows: https://nodejs.org/en/download
3. The existing project tables and views, including `vw_student_attendance_summary` and `vw_student_grade_report`.

> Important: Do **not** rerun the original full SQL file just to set up the website. Its first command drops and recreates the database. This backend only adds a separate login table.

## Easiest Windows setup

1. Extract this ZIP into a normal folder, for example `Desktop\Student_Attendance_Portal_Backend`.
2. Make sure MySQL Server is running and your `attendance_grade_system` schema already exists.
3. Double-click `START_PORTAL.bat`.
4. On the first run it creates `.env` and opens it in Notepad. Replace `PUT_YOUR_MYSQL_ROOT_PASSWORD_HERE` with the root password you set when installing MySQL. Do not share this password. Save and close Notepad.
5. Double-click `START_PORTAL.bat` again.
6. Wait for `Setup complete` and `Student Attendance Portal is running at http://localhost:3000`.
7. Open this address in Chrome or Edge: **http://localhost:3000**.
8. To stop the server, return to the black command window and press `Ctrl + C`.

The first start downloads Node packages, so it requires internet. Later starts use the installed packages.

## Demo website accounts

These are created in MySQL with hashed passwords by `npm run setup-demo`:

| Role | Username | Password (default) |
|---|---|---|
| Admin | `admin` | `admin123` |
| Faculty | `faculty` | `faculty123` |
| Student | `student` | `student123` |

The passwords can be changed in `.env` using `DEMO_ADMIN_PASSWORD`, `DEMO_FACULTY_PASSWORD`, and `DEMO_STUDENT_PASSWORD`. Run `npm run setup-demo` again after changing them. Never use these defaults for a public-facing site.

## Manual setup (if you prefer Command Prompt)

Open Command Prompt in this folder and run:

```bat
copy .env.example .env
notepad .env
npm install
npm run setup-demo
npm start
```

Edit `.env` before running `npm run setup-demo`. Set `DB_PASSWORD` to your MySQL password. If your MySQL account is not `root`, update `DB_USER` too.

## Useful checks

With the app running:

- Website: http://localhost:3000
- Health check: http://localhost:3000/api/health

The health check should return JSON similar to:

```json
{"ok":true,"database":"attendance_grade_system"}
```

## How the backend works (simple explanation)

1. The browser sends the username and password to `POST /api/auth/login`.
2. Express looks up the account in `website_accounts` and compares the password against its bcrypt hash.
3. Express creates a server session and sets an HTTP-only session cookie.
4. The browser requests `GET /api/data`.
5. Express queries your MySQL tables and views and sends the allowed rows back to the website.
6. The backend filters records by role: Admin gets all project records, Faculty sees assigned-subject records, and Student sees only their own records.

## Notes / limitations

- This project is intended for local college demonstration. The standard Express in-memory session store is not intended for production deployment.
- The frontend is read-only. It does not yet add attendance, modify marks or create students through forms.
- To share the website on the public internet, the backend and database must also be deployed securely. Uploading only the HTML folder to a static host will not make the MySQL login work. Do not expose your home MySQL server or root password publicly.
