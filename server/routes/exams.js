const express = require('express');
const router = express.Router();
const { authorizeRole } = require('../middleware/auth');
const {
  getAllExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  postExamResults
} = require('../controllers/examController');

// ===================
// EXAMS ROUTES
// ===================

// Get all exams
router.get('/exams', authorizeRole(['admin', 'teacher', 'student']), getAllExams);

// Get single exam
router.get('/exams/:id', authorizeRole(['admin', 'teacher', 'student']), getExamById);

// Create exam
router.post('/exams', authorizeRole(['admin', 'teacher']), createExam);

// Update exam
router.put('/exams/:id', authorizeRole(['admin', 'teacher']), updateExam);

// Delete exam
router.delete('/exams/:id', authorizeRole(['admin']), deleteExam);

// Post exam results
router.post('/exams/:id/results', authorizeRole(['admin', 'teacher']), postExamResults);

module.exports = router;