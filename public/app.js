/*
  Student Attendance & Grade Management System
  Front end for the Express + MySQL backend.
  Academic records are loaded from /api/data after server-side login.
*/
let departments = [];
let students = [];
let faculty = [];
let subjects = [];
let gradeRows = [];
let attendanceRows = [];
let subjectPerformance = [];

const appState = { user: null, page: "overview", summary: {} };
const loginScreen = document.getElementById("login-screen");
const portal = document.getElementById("portal");
const pageView = document.getElementById("page-view");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function deptName(id) { return departments.find((item) => item.id === Number(id))?.name || "—"; }
function deptShort(id) { return departments.find((item) => item.id === Number(id))?.short || "—"; }
function studentById(id) { return students.find((item) => item.id === Number(id)); }
function subjectById(id) { return subjects.find((item) => item.id === Number(id)); }
function facultyById(id) { return faculty.find((item) => item.id === Number(id)); }
function attendanceFor(studentId, subjectId) {
  return attendanceRows.find((row) => row.studentId === Number(studentId) && row.subjectId === Number(subjectId))
    || { total: 0, attended: 0, percentage: 0 };
}
function formatPercent(value) { return `${Number(value).toFixed(2)}%`; }
function isStudentUser() { return appState.user?.role === "Student"; }
function visibleStudents() { return students; }
function visibleGrades() { return gradeRows; }
function allAttendanceRows() {
  return attendanceRows.map((row) => {
    const student = studentById(row.studentId);
    const subject = subjectById(row.subjectId);
    if (!student || !subject) return null;
    return { student, subject, total: Number(row.total), attended: Number(row.attended), percentage: Number(row.percentage) };
  }).filter(Boolean);
}
function lowAttendanceWarnings() {
  return allAttendanceRows().filter((row) => row.total > 0 && row.percentage < 75);
}
function badgeForAttendance(row) {
  if (row.total === 0) return '<span class="status-badge neutral">Not started</span>';
  if (row.percentage < 75) return '<span class="status-badge warning">Below 75%</span>';
  return '<span class="status-badge good">On track</span>';
}
function pageHeader(title, description, tag = "Live MySQL data") {
  return `<div class="page-header"><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div><span class="page-tag">${escapeHtml(tag)}</span></div>`;
}
function canWriteRecords() { return ["Admin", "Faculty"].includes(appState.user?.role); }
function todayForInput() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function studentOptions() {
  return `<option value="" selected disabled>Choose a student…</option>` + students.map((student) => `<option value="${student.id}">${escapeHtml(student.roll)} — ${escapeHtml(student.name)}</option>`).join("");
}
function subjectOptions() {
  return `<option value="" selected disabled>Choose a subject…</option>` + subjects.map((subject) => `<option value="${subject.id}">${escapeHtml(subject.code)} — ${escapeHtml(subject.name)}</option>`).join("");
}
function attendanceEntryPanel() {
  if (!canWriteRecords()) return "";
  return `<section class="panel entry-panel"><div class="panel-header"><div><h2>Record attendance</h2><p>Save or update a student's attendance record in MySQL.</p></div><span class="status-badge good">Admin / Faculty</span></div><div class="panel-body">
    <form id="attendance-entry-form" class="entry-form">
      <div class="entry-grid">
        <div class="entry-field"><label for="attendance-student">Student</label><select id="attendance-student" name="studentId" required>${studentOptions()}</select></div>
        <div class="entry-field"><label for="attendance-subject">Subject</label><select id="attendance-subject" name="subjectId" required>${subjectOptions()}</select></div>
        <div class="entry-field"><label for="attendance-date">Class date</label><input id="attendance-date" name="attendanceDate" type="date" value="${todayForInput()}" required></div>
        <div class="entry-field"><label for="attendance-period">Period number</label><input id="attendance-period" name="periodNo" type="number" min="1" max="12" value="1" required></div>
        <div class="entry-field"><label for="attendance-status">Status</label><select id="attendance-status" name="status" required><option>Present</option><option>Absent</option><option>Late</option><option>Excused</option></select></div>
      </div>
      <p id="attendance-entry-message" class="entry-feedback" role="status" aria-live="polite"></p>
      <div class="entry-actions"><button type="submit" class="primary-button">Save attendance</button><span class="section-note">Same student + subject + date + period updates the existing record.</span></div>
    </form>
  </div></section>`;
}
function marksEntryPanel() {
  if (!canWriteRecords()) return "";
  return `<section class="panel entry-panel"><div class="panel-header"><div><h2>Enter or update marks</h2><p>Save assessment marks to MySQL. Grade reports update automatically.</p></div><span class="status-badge good">Admin / Faculty</span></div><div class="panel-body">
    <form id="marks-entry-form" class="entry-form">
      <div class="entry-grid">
        <div class="entry-field"><label for="marks-student">Student</label><select id="marks-student" name="studentId" required>${studentOptions()}</select></div>
        <div class="entry-field"><label for="marks-subject">Subject</label><select id="marks-subject" name="subjectId" required>${subjectOptions()}</select></div>
        <div class="entry-field"><label for="assessment-type">Assessment type</label><select id="assessment-type" name="assessmentType" required><option>Internal-1</option><option>Internal-2</option><option>Assignment</option><option>Practical</option><option>End-Sem</option></select></div>
        <div class="entry-field"><label for="marks-obtained">Marks obtained</label><input id="marks-obtained" name="marksObtained" type="number" min="0" step="0.01" value="0" required></div>
        <div class="entry-field"><label for="marks-max">Maximum marks</label><input id="marks-max" name="maxMarks" type="number" min="0.01" max="9999.99" step="0.01" value="20" required></div>
      </div>
      <p id="marks-entry-message" class="entry-feedback" role="status" aria-live="polite"></p>
      <div class="entry-actions"><button type="submit" class="primary-button">Save marks</button><span class="section-note">Same student + subject + assessment type updates the existing mark.</span></div>
    </form>
  </div></section>`;
}
async function submitRecordForm(form, endpoint, messageId, pageToRestore) {
  const message = document.getElementById(messageId);
  const button = form.querySelector('button[type="submit"]');
  const formData = Object.fromEntries(new FormData(form).entries());
  if (message) { message.textContent = "Saving to MySQL…"; message.className = "entry-feedback"; }
  button.disabled = true;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(formData)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The record could not be saved.");
    const refreshed = await loadPortalData();
    showPortal(refreshed, false);
    renderPage(pageToRestore, false);
    const successMessage = document.getElementById(messageId);
    if (successMessage) {
      successMessage.textContent = result.message || "Saved successfully.";
      successMessage.className = "entry-feedback success";
    }
  } catch (error) {
    const currentMessage = document.getElementById(messageId);
    if (currentMessage) {
      currentMessage.textContent = error.message || "Could not save the record. Check the server terminal.";
      currentMessage.className = "entry-feedback error";
    }
  } finally {
    const currentForm = document.getElementById(form.id);
    const currentButton = currentForm?.querySelector('button[type="submit"]');
    if (currentButton) currentButton.disabled = false;
  }
}
function statCard(label, value, note, symbol, warning = false) {
  return `<article class="stat-card"><div class="stat-top"><span>${escapeHtml(label)}</span><span class="stat-icon" aria-hidden="true">${symbol}</span></div><strong class="stat-value">${escapeHtml(value)}</strong><span class="stat-note ${warning ? "warning" : ""}">${escapeHtml(note)}</span></article>`;
}
function attendanceTable(rows, limit = null) {
  const displayRows = limit ? rows.slice(0, limit) : rows;
  if (!displayRows.length) return '<div class="empty-state">No attendance records match this view.</div>';
  return `<div class="table-scroll"><table><caption class="visually-hidden">Attendance summary by student and subject</caption><thead><tr><th scope="col">Student</th><th scope="col">Subject</th><th scope="col">Classes</th><th scope="col">Attended</th><th scope="col">Attendance</th><th scope="col">Status</th></tr></thead><tbody>${displayRows.map((row) => `<tr><td><span class="primary-text">${escapeHtml(row.student.name)}</span><span class="secondary-text">${escapeHtml(row.student.roll)}</span></td><td><span class="primary-text">${escapeHtml(row.subject.code)}</span><span class="secondary-text">${escapeHtml(row.subject.name)}</span></td><td>${row.total}</td><td>${row.attended}</td><td><strong>${formatPercent(row.percentage)}</strong></td><td>${badgeForAttendance(row)}</td></tr>`).join("")}</tbody></table></div>`;
}
function gradeTable(rows) {
  if (!rows.length) return '<div class="empty-state">No grade records are available for this account yet.</div>';
  return `<div class="table-scroll"><table><caption class="visually-hidden">Grade report by student and subject</caption><thead><tr><th scope="col">Student</th><th scope="col">Subject</th><th scope="col">Total marks</th><th scope="col">Percentage</th><th scope="col">Grade</th></tr></thead><tbody>${rows.map((row) => {
    const student = studentById(row.studentId); const subject = subjectById(row.subjectId);
    return `<tr><td><span class="primary-text">${escapeHtml(student.name)}</span><span class="secondary-text">${escapeHtml(student.roll)}</span></td><td><span class="primary-text">${escapeHtml(subject.code)}</span><span class="secondary-text">${escapeHtml(subject.name)}</span></td><td><strong>${row.total.toFixed(2)} / ${row.max.toFixed(2)}</strong></td><td>${formatPercent(row.percentage)}</td><td><span class="grade-badge ${row.grade === "A+" ? "top" : ""}">${escapeHtml(row.grade)}</span></td></tr>`;
  }).join("")}</tbody></table></div>`;
}
function subjectTable(rows = subjects) {
  return `<div class="table-scroll"><table><caption class="visually-hidden">Subject catalogue</caption><thead><tr><th scope="col">Code</th><th scope="col">Subject</th><th scope="col">Department</th><th scope="col">Faculty</th><th scope="col">Credits</th><th scope="col">Semester</th></tr></thead><tbody>${rows.map((subject) => `<tr><td class="primary-text">${escapeHtml(subject.code)}</td><td>${escapeHtml(subject.name)}</td><td>${escapeHtml(deptShort(subject.dept))}</td><td>${escapeHtml(facultyById(subject.faculty).name)}</td><td>${subject.credits}</td><td>${subject.semester}</td></tr>`).join("")}</tbody></table></div>`;
}
function studentsTable(rows) {
  return `<div class="table-scroll"><table><caption class="visually-hidden">Student directory</caption><thead><tr><th scope="col">Roll number</th><th scope="col">Student</th><th scope="col">Department</th><th scope="col">Semester</th><th scope="col">Status</th></tr></thead><tbody>${rows.map((student) => `<tr><td class="primary-text">${escapeHtml(student.roll)}</td><td><span class="primary-text">${escapeHtml(student.name)}</span><span class="secondary-text">${escapeHtml(student.email)}</span></td><td>${escapeHtml(deptShort(student.dept))}</td><td>${student.semester}</td><td><span class="status-badge good">${escapeHtml(student.status)}</span></td></tr>`).join("")}</tbody></table></div>`;
}
function overviewPage() {
  const studentsCount = Number(appState.summary.students ?? students.length);
  const attendanceRows = allAttendanceRows();
  const warningRows = lowAttendanceWarnings();
  const totalEnrollments = Number(appState.summary.enrollments ?? 0);
  return `${pageHeader(`Welcome, ${appState.user.name.split(" ")[0]}`, "Here is a quick look at student records, attendance and grade performance.", appState.user.role)}
    <div class="stats-grid">
      ${statCard("Students", studentsCount, isStudentUser() ? "Your student account" : "Loaded from MySQL", "♙")}
      ${statCard("Subjects", subjects.length, "Semester 3 catalogue", "▧")}
      ${statCard("Enrollments", totalEnrollments, isStudentUser() ? "Your enrolled subjects" : "Across enrolled students", "↔")}
      ${statCard("Open warnings", Number(appState.summary.openWarnings ?? warningRows.length), Number(appState.summary.openWarnings ?? warningRows.length) ? "Attendance below 75%" : "No open warnings in this view", "!", warningRows.length > 0)}
    </div>
    <div class="content-grid">
      <section class="panel"><div class="panel-header"><div><h2>Attendance overview</h2><p>Summary calculated from the connected MySQL records.</p></div><button class="secondary-button" type="button" data-page="attendance">View attendance</button></div><div class="panel-body"><div class="mini-bars">${subjects.slice(0, 4).map((subject) => {
        const relevant = attendanceRows.filter((r) => r.subject.id === subject.id && r.total > 0);
        const avg = relevant.length ? relevant.reduce((sum, item) => sum + item.percentage, 0) / relevant.length : 0;
        return `<div class="bar-row"><span class="bar-label">${escapeHtml(subject.code)}</span><div class="bar-track" aria-label="${escapeHtml(subject.code)} average attendance"><div class="bar-fill ${avg > 0 && avg < 75 ? "low" : ""}" style="width:${Math.min(100, avg)}%"></div></div><strong class="bar-number">${avg ? `${avg.toFixed(1)}%` : "No data"}</strong></div>`;
      }).join("")}</div><p class="section-note">Subjects without marked attendance are shown as “No data” in this visual summary.</p></div></section>
      <section class="panel"><div class="panel-header"><div><h2>Attendance alert</h2><p>Threshold configured in the project: 75%.</p></div></div><div class="panel-body">${warningRows.length ? warningRows.map((row) => `<div class="warning-card"><div class="warning-heading"><span aria-hidden="true">⚠</span> Low attendance</div><p><strong>${escapeHtml(row.student.name)}</strong> is at <strong>${formatPercent(row.percentage)}</strong> in ${escapeHtml(row.subject.code)}.</p><div class="warning-foot">${row.attended} of ${row.total} recorded classes attended • Status: Open</div></div>`).join("") : '<div class="callout">No low-attendance warnings are present in this user view.</div>'}<div class="quick-actions"><button class="action-link" type="button" data-page="grades">Open grade reports <span aria-hidden="true">→</span></button><button class="action-link" type="button" data-page="subjects">Browse subjects <span aria-hidden="true">→</span></button></div></div></section>
    </div>
    <section class="panel table-panel"><div class="panel-header"><div><h2>Recent grade reports</h2><p>Recent results returned from the MySQL grade view.</p></div><button class="secondary-button" type="button" data-page="grades">See all grades</button></div>${gradeTable(visibleGrades().slice(0, 4))}</section>`;
}
function studentsPage() {
  if (appState.user.role !== "Admin") return overviewPage();
  return `${pageHeader("Students", "Student directory retrieved from the connected MySQL database.", "8 students")}
    <section class="panel table-panel"><div class="panel-header"><div><h2>Student directory</h2><p>Search by name, roll number, email or department.</p></div><input id="student-search" class="search-input" type="search" placeholder="Search students…" aria-label="Search students"></div><div id="students-table">${studentsTable(students)}</div></section>
    <div class="callout"><strong>Data note:</strong> These records are returned by the backend from the attendance_grade_system database.</div>`;
}
function attendancePage() {
  const rows = allAttendanceRows();
  return `${pageHeader("Attendance", "View recorded classes and calculated attendance percentages.", "75% alert threshold")}
    ${attendanceEntryPanel()}
    <section class="panel table-panel"><div class="panel-header"><div><h2>Attendance summary</h2><p>Records with no marked classes are labelled Not started.</p></div><div class="panel-tools"><input id="attendance-search" class="search-input" type="search" placeholder="Search name or subject…" aria-label="Search attendance"><select id="attendance-filter" class="filter-select" aria-label="Filter attendance status"><option value="all">All statuses</option><option value="warning">Below 75%</option><option value="good">On track</option><option value="none">Not started</option></select></div></div><div id="attendance-table">${attendanceTable(rows)}</div></section>
    <p class="section-note">Attendance figures are queried from vw_student_attendance_summary in MySQL.</p>`;
}
function gradesPage() {
  const rows = visibleGrades();
  return `${pageHeader("Grades & results", "Student and subject-wise marks, percentages and grade bands.", "MySQL assessment results")}
    ${marksEntryPanel()}
    <section class="panel table-panel"><div class="panel-header"><div><h2>Grade report</h2><p>Calculated by the MySQL grade-report view.</p></div><input id="grade-search" class="search-input" type="search" placeholder="Search student or subject…" aria-label="Search grade reports"></div><div id="grades-table">${gradeTable(rows)}</div></section>
    <div class="callout"><strong>Example:</strong> Aarav Reddy scored 52/60 (86.67%) in DBMS301 and receives grade A in this demo report.</div>`;
}
function subjectsPage() {
  return `${pageHeader("Subjects", "Subjects retrieved from the connected MySQL database.", "6 subjects")}
    <section class="panel table-panel"><div class="panel-header"><div><h2>Subject catalogue</h2><p>Subject, department and assigned faculty information.</p></div><input id="subject-search" class="search-input" type="search" placeholder="Search subjects…" aria-label="Search subjects"></div><div id="subjects-table">${subjectTable()}</div></section>
    <section class="panel"><div class="panel-header"><div><h2>Departments</h2><p>Reference data used by students, faculty and subjects.</p></div></div><div class="panel-body">${departments.map((dept) => `<div class="bar-row" style="grid-template-columns:70px 1fr"><strong>${escapeHtml(dept.short)}</strong><span>${escapeHtml(dept.name)}</span></div>`).join("")}</div></section>`;
}
function erdPage() {
  return `${pageHeader("ER diagram", "Entity and relationship layout generated from the project schema.", "MySQL Workbench")}
    <div class="callout" style="margin-bottom:15px"><strong>Key relationship:</strong> Students and Subjects form a many-to-many relationship through Enrollments. Attendance, Marks and Attendance_Warnings link student and subject records.</div>
    <div class="er-image-frame"><img src="assets/attendance_grade_erd.png" alt="Entity relationship diagram showing departments, faculty, subjects, enrollments, students, attendance, marks, users, attendance warnings and reporting views."></div>`;
}
function reportsPage() {
  return `${pageHeader("Reports & export", "Download report data read from MySQL as CSV files.", "Local export")}
    <div class="report-cards">
      <section class="report-card"><h2>Attendance summary CSV</h2><p>Includes student, roll number, subject, total classes, attended classes and attendance percentage.</p><button type="button" class="primary-button" id="export-attendance">Download attendance CSV</button></section>
      <section class="report-card"><h2>Grade report CSV</h2><p>Includes student, subject, total marks, maximum marks, percentage and grade.</p><button type="button" class="primary-button" id="export-grades">Download grade CSV</button></section>
      <section class="report-card"><h2>Students CSV</h2><p>Exports the student directory available in the current account.</p><button type="button" class="secondary-button" id="export-students">Download students CSV</button></section>
      <section class="report-card"><h2>About this demo</h2><p>The portal reads records from MySQL through the Express backend. Admin and faculty accounts can record attendance and enter marks; student accounts are read-only.</p><button type="button" class="secondary-button" data-page="erd">View ER diagram</button></section>
    </div>`;
}
const pageTitles = { overview: "Overview", students: "Students", attendance: "Attendance", grades: "Grades", subjects: "Subjects", erd: "ER Diagram", reports: "Reports / Export" };
function renderPage(page, moveFocus = false) {
  if (page === "students" && appState.user.role !== "Admin") page = "overview";
  appState.page = page;
  document.getElementById("topbar-page").textContent = pageTitles[page] || "Overview";
  document.querySelectorAll(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.page === page));
  const renderers = { overview: overviewPage, students: studentsPage, attendance: attendancePage, grades: gradesPage, subjects: subjectsPage, erd: erdPage, reports: reportsPage };
  pageView.innerHTML = renderers[page]();
  bindPageControls();
  if (moveFocus) document.getElementById("main-content").focus();
}
function showPortal(data, moveFocus = true) {
  departments = data.departments || [];
  students = data.students || [];
  faculty = data.faculty || [];
  subjects = data.subjects || [];
  gradeRows = data.gradeRows || [];
  attendanceRows = data.attendanceRows || [];
  subjectPerformance = data.subjectPerformance || [];
  appState.summary = data.summary || {};
  appState.user = data.user;
  appState.page = "overview";
  loginScreen.classList.add("hidden");
  portal.classList.remove("hidden");
  document.getElementById("current-user-name").textContent = data.user.name;
  document.getElementById("current-user-role").textContent = data.user.role;
  document.getElementById("user-avatar").textContent = data.user.name.charAt(0).toUpperCase();
  document.querySelectorAll("[data-admin-only]").forEach((node) => node.classList.toggle("hidden", data.user.role !== "Admin"));
  renderPage("overview", moveFocus);
}

async function loadPortalData() {
  const response = await fetch("/api/data", { headers: { "Accept": "application/json" } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not load portal data from MySQL.");
  return data;
}

async function logout() {
  try { await fetch("/api/auth/logout", { method: "POST", headers: { "Accept": "application/json" } }); }
  finally {
    appState.user = null;
    appState.page = "overview";
    appState.summary = {};
    portal.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    loginForm.reset();
    loginError.textContent = "";
    document.getElementById("username").focus();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById("username").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  loginError.textContent = "Connecting to the database…";
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      loginError.textContent = result.error || "Login failed. Check the username and password.";
      document.getElementById("password").setAttribute("aria-invalid", "true");
      return;
    }
    const data = await loadPortalData();
    document.getElementById("password").removeAttribute("aria-invalid");
    loginError.textContent = "";
    showPortal(data, true);
  } catch (_error) {
    loginError.textContent = "Could not connect to the backend. Make sure MySQL is running and start the portal using START_PORTAL.bat.";
  } finally {
    submitButton.disabled = false;
  }
}
function csvEscape(value) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }
function downloadCsv(filename, headers, rows) {
  const contents = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + contents], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}
function exportAttendance() {
  const rows = allAttendanceRows().map((row) => [row.student.roll, row.student.name, row.subject.code, row.subject.name, row.total, row.attended, row.percentage.toFixed(2)]);
  downloadCsv("attendance_summary_demo.csv", ["roll_no", "student_name", "subject_code", "subject_name", "total_classes", "attended_classes", "attendance_percentage"], rows);
}
function exportGrades() {
  const rows = visibleGrades().map((row) => { const student = studentById(row.studentId); const subject = subjectById(row.subjectId); return [student.roll, student.name, subject.code, subject.name, row.total.toFixed(2), row.max.toFixed(2), row.percentage.toFixed(2), row.grade]; });
  downloadCsv("grade_report_demo.csv", ["roll_no", "student_name", "subject_code", "subject_name", "total_marks", "max_marks", "percentage", "grade"], rows);
}
function exportStudents() {
  const rows = visibleStudents().map((student) => [student.roll, student.name, student.email, deptName(student.dept), student.semester, student.status]);
  downloadCsv("students_demo.csv", ["roll_no", "full_name", "email", "department", "semester", "status"], rows);
}
function bindPageControls() {
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => renderPage(button.dataset.page, true));
  });
  const studentSearch = document.getElementById("student-search");
  if (studentSearch) studentSearch.addEventListener("input", () => {
    const term = studentSearch.value.toLowerCase().trim();
    const filtered = students.filter((s) => [s.name, s.roll, s.email, deptName(s.dept)].some((v) => v.toLowerCase().includes(term)));
    document.getElementById("students-table").innerHTML = filtered.length ? studentsTable(filtered) : '<div class="empty-state">No students found.</div>';
  });
  const attendanceSearch = document.getElementById("attendance-search");
  const attendanceFilter = document.getElementById("attendance-filter");
  const updateAttendance = () => {
    const term = (attendanceSearch?.value || "").toLowerCase().trim(); const filter = attendanceFilter?.value || "all";
    let rows = allAttendanceRows().filter((r) => [r.student.name, r.student.roll, r.subject.code, r.subject.name].some((v) => v.toLowerCase().includes(term)));
    if (filter === "warning") rows = rows.filter((r) => r.total > 0 && r.percentage < 75);
    if (filter === "good") rows = rows.filter((r) => r.total > 0 && r.percentage >= 75);
    if (filter === "none") rows = rows.filter((r) => r.total === 0);
    document.getElementById("attendance-table").innerHTML = attendanceTable(rows);
  };
  attendanceSearch?.addEventListener("input", updateAttendance); attendanceFilter?.addEventListener("change", updateAttendance);
  const gradeSearch = document.getElementById("grade-search");
  gradeSearch?.addEventListener("input", () => {
    const term = gradeSearch.value.toLowerCase().trim();
    const rows = visibleGrades().filter((r) => { const student = studentById(r.studentId); const subject = subjectById(r.subjectId); return [student.name, student.roll, subject.code, subject.name, r.grade].some((v) => String(v).toLowerCase().includes(term)); });
    document.getElementById("grades-table").innerHTML = gradeTable(rows);
  });
  const subjectSearch = document.getElementById("subject-search");
  subjectSearch?.addEventListener("input", () => {
    const term = subjectSearch.value.toLowerCase().trim();
    const rows = subjects.filter((r) => [r.code, r.name, deptName(r.dept), facultyById(r.faculty).name].some((v) => v.toLowerCase().includes(term)));
    document.getElementById("subjects-table").innerHTML = rows.length ? subjectTable(rows) : '<div class="empty-state">No subjects found.</div>';
  });
  document.getElementById("attendance-entry-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    submitRecordForm(event.currentTarget, "/api/attendance", "attendance-entry-message", "attendance");
  });
  document.getElementById("marks-entry-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const obtained = Number(form.elements.marksObtained.value);
    const maximum = Number(form.elements.maxMarks.value);
    if (obtained > maximum) {
      const message = document.getElementById("marks-entry-message");
      message.textContent = "Marks obtained cannot be greater than maximum marks.";
      message.className = "entry-feedback error";
      return;
    }
    submitRecordForm(form, "/api/marks", "marks-entry-message", "grades");
  });
  document.getElementById("export-attendance")?.addEventListener("click", exportAttendance);
  document.getElementById("export-grades")?.addEventListener("click", exportGrades);
  document.getElementById("export-students")?.addEventListener("click", exportStudents);
}

loginForm.addEventListener("submit", handleLogin);
document.getElementById("toggle-password").addEventListener("click", () => {
  const field = document.getElementById("password"); const button = document.getElementById("toggle-password");
  const showing = field.type === "text";
  field.type = showing ? "password" : "text";
  button.textContent = showing ? "Show" : "Hide";
  button.setAttribute("aria-label", showing ? "Show password" : "Hide password");
  button.setAttribute("aria-pressed", String(!showing));
});
document.getElementById("fill-student").addEventListener("click", () => {
  document.getElementById("username").value = "student";
  document.getElementById("password").value = "student123";
  loginError.textContent = "";
  document.getElementById("username").focus();
});
document.getElementById("logout-button").addEventListener("click", logout);
document.querySelectorAll(".nav-link").forEach((button) => button.addEventListener("click", () => renderPage(button.dataset.page, true)));

(async function restoreLoginSession() {
  try {
    const response = await fetch("/api/auth/me", { headers: { "Accept": "application/json" } });
    if (response.ok) {
      const data = await loadPortalData();
      showPortal(data, false);
    }
  } catch (_error) {
    // The page remains on the login screen; a message appears if login cannot reach the backend.
  }
})();
