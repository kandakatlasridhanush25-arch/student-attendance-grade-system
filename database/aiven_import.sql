-- Import this file while connected to the Aiven database named attendance_grade_system.

-- ============================================================
-- STEP 5/6: RELATIONAL SCHEMA / TABLE CREATION (DDL)
-- ============================================================

CREATE TABLE departments (
    dept_id INT PRIMARY KEY AUTO_INCREMENT,
    dept_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE students (
    student_id INT PRIMARY KEY AUTO_INCREMENT,
    roll_no VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    dept_id INT NOT NULL,
    semester TINYINT UNSIGNED NOT NULL,
    batch_year YEAR NOT NULL,
    status ENUM('Active','Inactive','Graduated') NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_student_semester CHECK (semester BETWEEN 1 AND 8),
    CONSTRAINT fk_student_department
        FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE faculty (
    faculty_id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    dept_id INT NOT NULL,
    CONSTRAINT fk_faculty_department
        FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE subjects (
    subject_id INT PRIMARY KEY AUTO_INCREMENT,
    subject_code VARCHAR(20) NOT NULL UNIQUE,
    subject_name VARCHAR(100) NOT NULL,
    credits TINYINT UNSIGNED NOT NULL,
    semester TINYINT UNSIGNED NOT NULL,
    dept_id INT NOT NULL,
    faculty_id INT NOT NULL,
    CONSTRAINT chk_subject_credits CHECK (credits BETWEEN 1 AND 8),
    CONSTRAINT chk_subject_semester CHECK (semester BETWEEN 1 AND 8),
    CONSTRAINT fk_subject_department
        FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_subject_faculty
        FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE enrollments (
    enrollment_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    academic_year VARCHAR(9) NOT NULL,
    enrollment_status ENUM('Enrolled','Dropped','Completed') NOT NULL DEFAULT 'Enrolled',
    enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_enrollment UNIQUE (student_id, subject_id, academic_year),
    CONSTRAINT fk_enrollment_student
        FOREIGN KEY (student_id) REFERENCES students(student_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_enrollment_subject
        FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(60) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN','FACULTY','STAFF') NOT NULL,
    faculty_id INT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_faculty
        FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)
        ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE attendance (
    attendance_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    period_no TINYINT UNSIGNED NOT NULL,
    status ENUM('Present','Absent','Late','Excused') NOT NULL,
    marked_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_attendance_slot UNIQUE (student_id, subject_id, attendance_date, period_no),
    CONSTRAINT chk_attendance_period CHECK (period_no BETWEEN 1 AND 12),
    CONSTRAINT fk_attendance_student
        FOREIGN KEY (student_id) REFERENCES students(student_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_attendance_subject
        FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_attendance_marker
        FOREIGN KEY (marked_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE marks (
    mark_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    assessment_type ENUM('Internal-1','Internal-2','Assignment','Practical','End-Sem') NOT NULL,
    marks_obtained DECIMAL(6,2) NOT NULL,
    max_marks DECIMAL(6,2) NOT NULL,
    entered_by INT NOT NULL,
    entered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_mark UNIQUE (student_id, subject_id, assessment_type),
    CONSTRAINT chk_mark_nonnegative CHECK (marks_obtained >= 0 AND max_marks > 0),
    CONSTRAINT fk_mark_student
        FOREIGN KEY (student_id) REFERENCES students(student_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_mark_subject
        FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_mark_user
        FOREIGN KEY (entered_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE attendance_warnings (
    warning_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    attendance_percentage DECIMAL(5,2) NOT NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    warning_status ENUM('Open','Resolved') NOT NULL DEFAULT 'Open',
    CONSTRAINT uq_warning UNIQUE (student_id, subject_id),
    CONSTRAINT fk_warning_student
        FOREIGN KEY (student_id) REFERENCES students(student_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_warning_subject
        FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

-- ============================================================
-- STEP 7: DML - SAMPLE DATA
-- ============================================================

INSERT INTO departments (dept_name) VALUES
('Computer Science and Engineering'),
('Information Technology'),
('Electronics and Communication Engineering');

INSERT INTO faculty (faculty_name, email, dept_id) VALUES
('Dr. Anil Kumar', 'anil.kumar@example.edu', 1),
('Ms. Priya Sharma', 'priya.sharma@example.edu', 1),
('Mr. Ravi Teja', 'ravi.teja@example.edu', 2),
('Dr. Neha Rao', 'neha.rao@example.edu', 3);

INSERT INTO students (roll_no, full_name, email, dept_id, semester, batch_year) VALUES
('CSE24A001','Aarav Reddy','aarav.reddy@example.edu',1,3,2024),
('CSE24A002','Bhavana Rao','bhavana.rao@example.edu',1,3,2024),
('CSE24A003','Charan Kumar','charan.kumar@example.edu',1,3,2024),
('CSE24A004','Diya Sharma','diya.sharma@example.edu',1,3,2024),
('CSE24A005','Eshan Varma','eshan.varma@example.edu',1,3,2024),
('CSE24A006','Farhan Ali','farhan.ali@example.edu',1,3,2024),
('IT24B001','Gauri Singh','gauri.singh@example.edu',2,3,2024),
('IT24B002','Harsh Patel','harsh.patel@example.edu',2,3,2024);

INSERT INTO subjects (subject_code, subject_name, credits, semester, dept_id, faculty_id) VALUES
('DBMS301','Database Management Systems',4,3,1,1),
('DS302','Data Structures',4,3,1,2),
('OS303','Operating Systems',4,3,1,1),
('AI304','Artificial Intelligence',3,3,2,3),
('CN305','Computer Networks',4,3,1,2),
('EC306','Digital Electronics',3,3,3,4);

INSERT INTO users (username, password_hash, role, faculty_id) VALUES
('admin_user','$2y$10$demo-admin-hash','ADMIN',NULL),
('anil.faculty','$2y$10$demo-anil-hash','FACULTY',1),
('priya.faculty','$2y$10$demo-priya-hash','FACULTY',2),
('ravi.faculty','$2y$10$demo-ravi-hash','FACULTY',3),
('neha.faculty','$2y$10$demo-neha-hash','FACULTY',4);

-- Enrolments for academic year 2026-27
INSERT INTO enrollments (student_id, subject_id, academic_year)
SELECT s.student_id, sub.subject_id, '2026-2027'
FROM students s
CROSS JOIN subjects sub
WHERE s.semester = 3;

-- ============================================================
-- STEP 8: STORED PROCEDURES + TRIGGERS
-- ============================================================

DELIMITER $$

CREATE PROCEDURE sp_refresh_attendance_warning(
    IN p_student_id INT,
    IN p_subject_id INT
)
BEGIN
    DECLARE v_total INT DEFAULT 0;
    DECLARE v_present INT DEFAULT 0;
    DECLARE v_pct DECIMAL(5,2) DEFAULT 0.00;

    SELECT COUNT(*),
           COALESCE(SUM(status IN ('Present','Late','Excused')),0)
      INTO v_total, v_present
      FROM attendance
     WHERE student_id = p_student_id
       AND subject_id = p_subject_id;

    IF v_total > 0 THEN
        SET v_pct = ROUND((v_present / v_total) * 100, 2);
    END IF;

    IF v_total > 0 AND v_pct < 75.00 THEN
        INSERT INTO attendance_warnings
            (student_id, subject_id, attendance_percentage, generated_at, warning_status)
        VALUES
            (p_student_id, p_subject_id, v_pct, CURRENT_TIMESTAMP, 'Open')
        ON DUPLICATE KEY UPDATE
            attendance_percentage = VALUES(attendance_percentage),
            generated_at = CURRENT_TIMESTAMP,
            warning_status = 'Open';
    ELSE
        DELETE FROM attendance_warnings
         WHERE student_id = p_student_id
           AND subject_id = p_subject_id;
    END IF;
END$$

CREATE PROCEDURE sp_mark_attendance(
    IN p_student_id INT,
    IN p_subject_id INT,
    IN p_attendance_date DATE,
    IN p_period_no TINYINT,
    IN p_status VARCHAR(10),
    IN p_marked_by INT
)
BEGIN
    DECLARE v_enrolled INT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT COUNT(*) INTO v_enrolled
      FROM enrollments
     WHERE student_id = p_student_id
       AND subject_id = p_subject_id
       AND enrollment_status = 'Enrolled';

    IF v_enrolled = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student is not enrolled in this subject.';
    END IF;

    INSERT INTO attendance
        (student_id, subject_id, attendance_date, period_no, status, marked_by)
    VALUES
        (p_student_id, p_subject_id, p_attendance_date, p_period_no, p_status, p_marked_by)
    ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        marked_by = VALUES(marked_by);

    COMMIT;
END$$

CREATE PROCEDURE sp_enter_mark(
    IN p_student_id INT,
    IN p_subject_id INT,
    IN p_assessment_type VARCHAR(20),
    IN p_marks_obtained DECIMAL(6,2),
    IN p_max_marks DECIMAL(6,2),
    IN p_entered_by INT
)
BEGIN
    DECLARE v_enrolled INT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT COUNT(*) INTO v_enrolled
      FROM enrollments
     WHERE student_id = p_student_id
       AND subject_id = p_subject_id
       AND enrollment_status = 'Enrolled';

    IF v_enrolled = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student is not enrolled in this subject.';
    END IF;

    IF p_marks_obtained < 0 OR p_max_marks <= 0 OR p_marks_obtained > p_max_marks THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid marks: obtained marks must be between 0 and maximum marks.';
    END IF;

    INSERT INTO marks
        (student_id, subject_id, assessment_type, marks_obtained, max_marks, entered_by)
    VALUES
        (p_student_id, p_subject_id, p_assessment_type, p_marks_obtained, p_max_marks, p_entered_by)
    ON DUPLICATE KEY UPDATE
        marks_obtained = VALUES(marks_obtained),
        max_marks = VALUES(max_marks),
        entered_by = VALUES(entered_by),
        entered_at = CURRENT_TIMESTAMP;

    COMMIT;
END$$

CREATE TRIGGER trg_attendance_before_insert
BEFORE INSERT ON attendance
FOR EACH ROW
BEGIN
    DECLARE v_enrolled INT DEFAULT 0;
    SELECT COUNT(*) INTO v_enrolled
      FROM enrollments
     WHERE student_id = NEW.student_id
       AND subject_id = NEW.subject_id
       AND enrollment_status = 'Enrolled';

    IF v_enrolled = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Attendance cannot be marked for a non-enrolled student.';
    END IF;
END$$

CREATE TRIGGER trg_attendance_after_insert
AFTER INSERT ON attendance
FOR EACH ROW
BEGIN
    CALL sp_refresh_attendance_warning(NEW.student_id, NEW.subject_id);
END$$

CREATE TRIGGER trg_attendance_after_update
AFTER UPDATE ON attendance
FOR EACH ROW
BEGIN
    CALL sp_refresh_attendance_warning(OLD.student_id, OLD.subject_id);
    CALL sp_refresh_attendance_warning(NEW.student_id, NEW.subject_id);
END$$

CREATE TRIGGER trg_attendance_after_delete
AFTER DELETE ON attendance
FOR EACH ROW
BEGIN
    CALL sp_refresh_attendance_warning(OLD.student_id, OLD.subject_id);
END$$

CREATE TRIGGER trg_marks_before_insert
BEFORE INSERT ON marks
FOR EACH ROW
BEGIN
    DECLARE v_enrolled INT DEFAULT 0;
    SELECT COUNT(*) INTO v_enrolled
      FROM enrollments
     WHERE student_id = NEW.student_id
       AND subject_id = NEW.subject_id
       AND enrollment_status = 'Enrolled';

    IF v_enrolled = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Marks cannot be entered for a non-enrolled student.';
    END IF;

    IF NEW.marks_obtained < 0 OR NEW.max_marks <= 0 OR NEW.marks_obtained > NEW.max_marks THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid marks value.';
    END IF;
END$$

CREATE TRIGGER trg_marks_before_update
BEFORE UPDATE ON marks
FOR EACH ROW
BEGIN
    IF NEW.marks_obtained < 0 OR NEW.max_marks <= 0 OR NEW.marks_obtained > NEW.max_marks THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid marks value.';
    END IF;
END$$

DELIMITER ;

-- ============================================================
-- SAMPLE ATTENDANCE DATA (10 classes for selected students)
-- The first student has 70% attendance in DBMS -> warning expected.
-- ============================================================

INSERT INTO attendance (student_id, subject_id, attendance_date, period_no, status, marked_by) VALUES
(1,1,'2026-07-01',1,'Present',2),
(1,1,'2026-07-03',1,'Present',2),
(1,1,'2026-07-05',1,'Absent',2),
(1,1,'2026-07-07',1,'Present',2),
(1,1,'2026-07-09',1,'Absent',2),
(1,1,'2026-07-11',1,'Present',2),
(1,1,'2026-07-13',1,'Absent',2),
(1,1,'2026-07-15',1,'Present',2),
(1,1,'2026-07-17',1,'Present',2),
(1,1,'2026-07-19',1,'Absent',2),
(2,1,'2026-07-01',1,'Present',2),
(2,1,'2026-07-03',1,'Present',2),
(2,1,'2026-07-05',1,'Present',2),
(2,1,'2026-07-07',1,'Present',2),
(2,1,'2026-07-09',1,'Present',2),
(2,1,'2026-07-11',1,'Absent',2),
(2,1,'2026-07-13',1,'Present',2),
(2,1,'2026-07-15',1,'Present',2),
(2,1,'2026-07-17',1,'Present',2),
(2,1,'2026-07-19',1,'Present',2),
(3,1,'2026-07-01',1,'Present',2),
(3,1,'2026-07-03',1,'Present',2),
(3,1,'2026-07-05',1,'Present',2),
(3,1,'2026-07-07',1,'Present',2),
(3,1,'2026-07-09',1,'Present',2);

INSERT INTO attendance (student_id, subject_id, attendance_date, period_no, status, marked_by) VALUES
(1,2,'2026-07-02',1,'Present',3),
(1,2,'2026-07-04',1,'Present',3),
(1,2,'2026-07-06',1,'Present',3),
(1,2,'2026-07-08',1,'Present',3),
(1,2,'2026-07-10',1,'Absent',3),
(2,2,'2026-07-02',1,'Present',3),
(2,2,'2026-07-04',1,'Present',3),
(2,2,'2026-07-06',1,'Present',3),
(2,2,'2026-07-08',1,'Present',3),
(2,2,'2026-07-10',1,'Present',3);

-- ============================================================
-- SAMPLE MARKS
-- ============================================================

INSERT INTO marks (student_id, subject_id, assessment_type, marks_obtained, max_marks, entered_by) VALUES
(1,1,'Internal-1',22,25,2),
(1,1,'Internal-2',20,25,2),
(1,1,'Assignment',9,10,2),
(1,2,'Internal-1',21,25,3),
(1,2,'Internal-2',23,25,3),
(1,2,'Assignment',8,10,3),
(2,1,'Internal-1',24,25,2),
(2,1,'Internal-2',21,25,2),
(2,1,'Assignment',10,10,2),
(2,2,'Internal-1',20,25,3),
(2,2,'Internal-2',19,25,3),
(2,2,'Assignment',9,10,3),
(3,1,'Internal-1',18,25,2),
(3,1,'Internal-2',19,25,2),
(3,1,'Assignment',8,10,2);

-- ============================================================
-- VIEWS (REPORTING / COMPLEX SQL)
-- ============================================================

CREATE OR REPLACE VIEW vw_student_attendance_summary AS
SELECT
    s.student_id,
    s.roll_no,
    s.full_name,
    sub.subject_id,
    sub.subject_code,
    sub.subject_name,
    COUNT(a.attendance_id) AS total_classes,
    COALESCE(SUM(a.status IN ('Present','Late','Excused')), 0) AS attended_classes,
    ROUND(
        CASE WHEN COUNT(a.attendance_id) = 0 THEN 0
             ELSE 100.0 * SUM(a.status IN ('Present','Late','Excused')) / COUNT(a.attendance_id)
        END, 2
    ) AS attendance_percentage
FROM students s
JOIN enrollments e ON e.student_id = s.student_id
JOIN subjects sub ON sub.subject_id = e.subject_id
LEFT JOIN attendance a
  ON a.student_id = s.student_id
 AND a.subject_id = sub.subject_id
WHERE e.enrollment_status = 'Enrolled'
GROUP BY s.student_id, s.roll_no, s.full_name,
         sub.subject_id, sub.subject_code, sub.subject_name;

CREATE OR REPLACE VIEW vw_student_grade_report AS
SELECT
    s.student_id,
    s.roll_no,
    s.full_name,
    sub.subject_id,
    sub.subject_code,
    sub.subject_name,
    ROUND(SUM(m.marks_obtained),2) AS total_marks,
    ROUND(SUM(m.max_marks),2) AS total_max_marks,
    ROUND(100.0 * SUM(m.marks_obtained) / NULLIF(SUM(m.max_marks),0),2) AS percentage,
    CASE
        WHEN 100.0 * SUM(m.marks_obtained) / NULLIF(SUM(m.max_marks),0) >= 90 THEN 'A+'
        WHEN 100.0 * SUM(m.marks_obtained) / NULLIF(SUM(m.max_marks),0) >= 80 THEN 'A'
        WHEN 100.0 * SUM(m.marks_obtained) / NULLIF(SUM(m.max_marks),0) >= 70 THEN 'B'
        WHEN 100.0 * SUM(m.marks_obtained) / NULLIF(SUM(m.max_marks),0) >= 60 THEN 'C'
        WHEN 100.0 * SUM(m.marks_obtained) / NULLIF(SUM(m.max_marks),0) >= 50 THEN 'D'
        ELSE 'F'
    END AS grade
FROM students s
JOIN marks m ON m.student_id = s.student_id
JOIN subjects sub ON sub.subject_id = m.subject_id
GROUP BY s.student_id, s.roll_no, s.full_name,
         sub.subject_id, sub.subject_code, sub.subject_name;

CREATE OR REPLACE VIEW vw_subject_performance AS
SELECT
    sub.subject_code,
    sub.subject_name,
    ROUND(AVG(100.0 * m.marks_obtained / NULLIF(m.max_marks,0)),2) AS average_assessment_percentage,
    COUNT(DISTINCT m.student_id) AS students_assessed
FROM subjects sub
JOIN marks m ON m.subject_id = sub.subject_id
GROUP BY sub.subject_id, sub.subject_code, sub.subject_name;

DELIMITER $$
CREATE PROCEDURE sp_student_report(IN p_student_id INT)
BEGIN
    SELECT *
      FROM vw_student_grade_report
     WHERE student_id = p_student_id
     ORDER BY subject_code;
END$$
DELIMITER ;


-- ============================================================
-- STEP 8: JOINS / SUBQUERIES / REPORT QUERIES
-- ============================================================

-- A. Complete attendance report
SELECT *
FROM vw_student_attendance_summary
ORDER BY roll_no, subject_code;

-- B. Students below 75% attendance
SELECT roll_no, full_name, subject_code, subject_name, attendance_percentage
FROM vw_student_attendance_summary
WHERE attendance_percentage < 75
ORDER BY attendance_percentage ASC;

-- C. Grade report for all assessed students
SELECT *
FROM vw_student_grade_report
ORDER BY roll_no, subject_code;

-- D. Multi-table JOIN: student + department + subject + faculty
SELECT s.roll_no, s.full_name, d.dept_name,
       sub.subject_code, sub.subject_name,
       f.faculty_name
FROM students s
JOIN departments d ON d.dept_id = s.dept_id
JOIN enrollments e ON e.student_id = s.student_id AND e.enrollment_status = 'Enrolled'
JOIN subjects sub ON sub.subject_id = e.subject_id
JOIN faculty f ON f.faculty_id = sub.faculty_id
ORDER BY s.roll_no, sub.subject_code;

-- E. Students whose subject percentage is above the overall assessed average
SELECT g.roll_no, g.full_name, g.subject_code, g.percentage
FROM vw_student_grade_report g
WHERE g.percentage > (SELECT AVG(percentage) FROM vw_student_grade_report);

-- ============================================================
-- STEP 9: TRANSACTION MANAGEMENT
-- ============================================================

-- Successful transaction example
START TRANSACTION;
UPDATE marks
   SET marks_obtained = 21.00
 WHERE student_id = 1
   AND subject_id = 1
   AND assessment_type = 'Internal-1';
COMMIT;

-- Rollback example (safe demonstration; no permanent change)
START TRANSACTION;
UPDATE marks
   SET marks_obtained = 0.00
 WHERE student_id = 1
   AND subject_id = 1
   AND assessment_type = 'Internal-2';
ROLLBACK;

-- Concurrency / row-lock demonstration (run in two MySQL sessions)
-- Session A:
-- START TRANSACTION;
-- SELECT * FROM enrollments
--  WHERE student_id = 1 AND subject_id = 1
--  FOR UPDATE;
-- UPDATE marks SET marks_obtained = 22 WHERE student_id = 1 AND subject_id = 1 AND assessment_type = 'Internal-1';
-- COMMIT;
-- Session B can execute the same FOR UPDATE query and will wait for Session A's lock.

-- ============================================================
-- STEP 10: INDEXING & OPTIMIZATION
-- ============================================================

CREATE INDEX idx_attendance_student_subject
    ON attendance(student_id, subject_id);

CREATE INDEX idx_attendance_subject_date
    ON attendance(subject_id, attendance_date);

CREATE INDEX idx_marks_student_subject
    ON marks(student_id, subject_id);

CREATE INDEX idx_enrollments_subject_student
    ON enrollments(subject_id, student_id);

-- Query-cost analysis examples
EXPLAIN SELECT *
FROM attendance
WHERE student_id = 1 AND subject_id = 1
ORDER BY attendance_date;

EXPLAIN SELECT *
FROM marks
WHERE student_id = 1 AND subject_id = 1;

-- ============================================================
-- STEP 11: TESTING / VALIDATION QUERIES
-- ============================================================

-- Test 1: warning must exist for student 1 + DBMS (expected 60% before the procedure call below)
SELECT * FROM attendance_warnings;

-- Test 2: procedure attendance entry; changes an existing slot safely
CALL sp_mark_attendance(1,1,'2026-07-19',1,'Present',2);

-- Test 3: warning should be recalculated after procedure call
SELECT *
FROM vw_student_attendance_summary
WHERE student_id = 1 AND subject_id = 1;

-- Test 4: valid mark update
CALL sp_enter_mark(1,1,'Internal-1',23,25,2);

-- Test 5: report procedure
CALL sp_student_report(1);

-- Test 6: invalid marks (should fail with SIGNAL)
-- CALL sp_enter_mark(1,1,'Internal-2',30,25,2);

-- Test 7: referential integrity (should fail if department id does not exist)
-- INSERT INTO students (roll_no, full_name, email, dept_id, semester, batch_year)
-- VALUES ('BAD001','Invalid Student','invalid@example.edu',999,3,2026);

-- Test 8: duplicate attendance slot (should update through procedure instead)
-- INSERT INTO attendance (student_id, subject_id, attendance_date, period_no, status, marked_by)
-- VALUES (1,1,'2026-07-19',1,'Absent',2);

-- ============================================================
-- STEP 7: DCL - RUN ONLY WITH ADMIN/ROOT PRIVILEGES
-- ============================================================
-- These commands may be skipped in phpMyAdmin if your account does not
-- have CREATE USER / GRANT privileges. They are included to demonstrate DCL.

-- CREATE ROLE IF NOT EXISTS 'attendance_faculty_role';
-- GRANT SELECT ON attendance_grade_system.vw_student_attendance_summary TO 'attendance_faculty_role';
-- GRANT SELECT ON attendance_grade_system.vw_student_grade_report TO 'attendance_faculty_role';
-- GRANT SELECT, INSERT, UPDATE ON attendance_grade_system.attendance TO 'attendance_faculty_role';
-- GRANT SELECT, INSERT, UPDATE ON attendance_grade_system.marks TO 'attendance_faculty_role';
-- GRANT EXECUTE ON PROCEDURE attendance_grade_system.sp_mark_attendance TO 'attendance_faculty_role';
-- GRANT EXECUTE ON PROCEDURE attendance_grade_system.sp_enter_mark TO 'attendance_faculty_role';
-- CREATE USER IF NOT EXISTS 'faculty_demo'@'localhost' IDENTIFIED BY 'ChangeThisPassword!';
-- GRANT 'attendance_faculty_role' TO 'faculty_demo'@'localhost';
-- SET DEFAULT ROLE 'attendance_faculty_role' TO 'faculty_demo'@'localhost';

-- END OF PROJECT SCRIPT
