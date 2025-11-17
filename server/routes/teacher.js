const express = require('express');
const router = express.Router();
const { authorizeRole } = require('../middleware/auth');
const {
  getAttendanceRoster,
  markAttendance,
  submitGrade
} = require('../controllers/teacherController');

// ===================
// TEACHER ROUTES
// ===================

// Get attendance roster for a teacher's class
router.get('/attendance/roster', authorizeRole(['teacher']), getAttendanceRoster);

// Mark attendance for students
router.post('/attendance', authorizeRole(['teacher']), markAttendance);

// Submit a grade for a student
router.post('/performance', authorizeRole(['teacher']), submitGrade);

module.exports = router;