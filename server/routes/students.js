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

// Get current student's own information
router.get('/me', authorizeRole(['student']), async (req, res) => {
  try {
    const { schoolId, user } = req;

    // Find the student record for this user
    const result = await query(
      `SELECT s.* FROM students s WHERE s.user_id = $1 AND s.school_id = $2 AND s.status = 'active'`,
      [user.id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Student record not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching student info:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch student information' });
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

// Get student performance
router.get('/:id/performance', authorizeRole(['admin', 'teacher', 'parent']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;

    const result = await query(`
      SELECT p.*, a.title as assignment_title, c.name as course_name
      FROM performance p
      LEFT JOIN assignments a ON p.assignment_id = a.id
      LEFT JOIN courses c ON a.course_id = c.id
      WHERE p.student_id = $1 AND c.school_id = $2
      ORDER BY p.submitted_at DESC
    `, [id, schoolId]);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching student performance:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch performance' });
  }
});

// Get student attendance
router.get('/:id/attendance', authorizeRole(['admin', 'teacher', 'parent']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;

    const result = await query(`
      SELECT a.*, c.name as course_name
      FROM attendance a
      LEFT JOIN courses c ON a.class_id = c.code
      WHERE a.student_id = $1 AND c.school_id = $2
      ORDER BY a.date DESC
    `, [id, schoolId]);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching student attendance:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch attendance' });
  }
});

// Get student fees
router.get('/:id/fees', authorizeRole(['admin', 'teacher', 'parent']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;

    // For now, return mock data since fee system isn't fully implemented
    const mockFees = [
      {
        id: 1,
        description: 'Tuition Fee',
        amount_due: 5000,
        amount_paid: 3000,
        due_date: '2024-12-31',
        payment_status: 'partial'
      }
    ];

    res.json({ success: true, data: mockFees });
  } catch (err) {
    console.error('Error fetching student fees:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch fees' });
  }
});

module.exports = router;
