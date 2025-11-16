const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authorizeRole } = require('../middleware/auth');
const studentService = require('../services/studentService');

// Get all students
router.get('/', authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { grade, status, search } = req.query;
    
    const students = await studentService.getStudents(schoolId, { grade, status, search });
    res.json({ success: true, data: students });
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch students' });
  }
});

// Get student by ID
router.get('/:id', authorizeRole(['admin', 'teacher', 'parent']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    
    const student = await studentService.getStudentById(id, schoolId);
    
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    
    res.json({ success: true, data: student });
  } catch (err) {
    console.error('Error fetching student:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch student' });
  }
});

// Create student
router.post('/', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const student = await studentService.createStudentAndParent(req.body, schoolId);

    res.status(201).json({ success: true, data: student, message: 'Student created successfully' });
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create student' });
  }
});

// Update student
router.put('/:id', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    
    const student = await studentService.updateStudent(id, schoolId, req.body);
    
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found or access denied' });
    }
    
    res.json({ success: true, data: student, message: 'Student updated successfully' });
  } catch (err) {
    console.error('Error updating student:', err);
    res.status(500).json({ success: false, error: 'Failed to update student' });
  }
});

// Delete student (soft delete)
router.delete('/:id', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    
    const student = await studentService.deleteStudent(id, schoolId);
    
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (err) {
    console.error('Error deleting student:', err);
    res.status(500).json({ success: false, error: 'Failed to delete student' });
  }
});

// Get student performance
router.get('/:id/performance', authorizeRole(['admin', 'teacher', 'parent', 'student']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    
    const performance = await studentService.getStudentPerformance(id, schoolId);
    res.json({ success: true, data: performance });
  } catch (err) {
    console.error('Error fetching student performance:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch performance' });
  }
});

// Get student attendance
router.get('/:id/attendance', authorizeRole(['admin', 'teacher', 'parent', 'student']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    const attendance = await studentService.getStudentAttendance(id, schoolId, { startDate, endDate });
    res.json({ success: true, data: attendance });
  } catch (err) {
    console.error('Error fetching student attendance:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch attendance' });
  }
});

// Get courses for a specific student
router.get('/:id/courses', authorizeRole(['admin', 'teacher', 'student', 'parent']), async (req, res) => {
  try {
    const { schoolId, user } = req;
    const { id } = req.params;

    // Check permissions - students can only see their own courses, parents can see their child's courses
    if (user.role === 'student') {
      const studentCheck = await query('SELECT id FROM students WHERE user_id = $1 AND school_id = $2', [user.id, schoolId]);
      if (studentCheck.rows.length === 0 || studentCheck.rows[0].id !== parseInt(id)) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    // For now, return empty array - you might want to implement student-course relationships
    res.json({ success: true, data: [] });
  } catch (err) {
    console.error('Error fetching student courses:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch courses' });
  }
});

module.exports = router;
