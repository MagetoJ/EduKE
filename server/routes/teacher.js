const express = require('express');
const router = express.Router();
const { authorizeRole } = require('../middleware/auth');
const {
  getAllTeachers,
  getAttendanceRoster,
  markAttendance,
  submitGrade
} = require('../controllers/teacherController');

// ===================
// TEACHER ROUTES
// ===================

// Get all teachers for the school
router.get('/', authorizeRole(['super_admin', 'admin', 'teacher', 'student', 'parent']), getAllTeachers);

// Get attendance roster for a teacher's class
router.get('/attendance/roster', authorizeRole(['teacher']), getAttendanceRoster);

// Mark attendance for students
router.post('/attendance', authorizeRole(['teacher']), markAttendance);

// Submit a grade for a student
router.post('/performance', authorizeRole(['teacher']), submitGrade);

module.exports = router;