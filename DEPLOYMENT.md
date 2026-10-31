# Public deployment notes

This repository is prepared for a Node/Express web service plus a hosted MySQL database.

Required environment variables on the host:
- DB_HOST
- DB_PORT
- DB_USER
- DB_PASSWORD
- DB_NAME=attendance_grade_system
- DB_SSL=true
- SESSION_SECRET (long random value)
- NODE_ENV=production

Optional demo passwords:
- DEMO_ADMIN_PASSWORD
- DEMO_FACULTY_PASSWORD
- DEMO_STUDENT_PASSWORD

The start command is `npm start`. It creates/refreshes the separate `website_accounts` login table and then launches the web server. It does not drop the academic project tables.
