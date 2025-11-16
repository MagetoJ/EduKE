const express = require('express');
const router = express.Router();
const { authorizeRole } = require('../middleware/auth');
const {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseStudents,
  getCourseResources,
  addCourseResource,
  deleteCourseResource
} = require('../controllers/courseController');

// --- Courses ---
router.get('/courses', authorizeRole(['admin', 'teacher', 'student', 'parent']), getAllCourses);

router.get('/courses/:id', authorizeRole(['admin', 'teacher', 'student']), getCourseById);

router.post('/courses', authorizeRole(['admin']), createCourse);

router.put('/courses/:id', authorizeRole(['admin']), updateCourse);

router.delete('/courses/:id', authorizeRole(['admin']), deleteCourse);

router.get('/courses/:id/students', authorizeRole(['admin', 'teacher']), getCourseStudents);

router.get('/courses/:id/resources', authorizeRole(['admin', 'teacher', 'student']), getCourseResources);

router.post('/courses/:id/resources', authorizeRole(['admin', 'teacher']), addCourseResource);

router.delete('/courses/:id/resources/:resourceId', authorizeRole(['admin', 'teacher']), deleteCourseResource);

module.exports = router;