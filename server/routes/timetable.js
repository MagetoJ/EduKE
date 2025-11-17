const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authorizeRole } = require('../middleware/auth');

// Get all timetable entries for a school
router.get('/', authorizeRole(['admin', 'teacher', 'student', 'parent']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { grade, class_section, teacher_id, day_of_week } = req.query;

    let sql = `
      SELECT
        te.*,
        c.name as course_name,
        c.code as course_code,
        u.name as teacher_name,
        tp.start_time,
        tp.end_time,
        tp.period_name
      FROM timetable_entries te
      LEFT JOIN courses c ON te.course_id = c.id
      LEFT JOIN users u ON te.teacher_id = u.id
      LEFT JOIN timetable_periods tp ON te.period_id = tp.id
      WHERE te.school_id = $1
    `;

    const params = [schoolId];
    let paramIndex = 2;

    if (grade) {
      sql += ` AND te.grade = $${paramIndex}`;
      params.push(grade);
      paramIndex++;
    }

    if (class_section) {
      sql += ` AND te.class_section = $${paramIndex}`;
      params.push(class_section);
      paramIndex++;
    }

    if (teacher_id) {
      sql += ` AND te.teacher_id = $${paramIndex}`;
      params.push(teacher_id);
      paramIndex++;
    }

    if (day_of_week) {
      sql += ` AND te.day_of_week = $${paramIndex}`;
      params.push(day_of_week);
      paramIndex++;
    }

    sql += ` ORDER BY te.day_of_week, tp.start_time`;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching timetable:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch timetable' });
  }
});

// Get timetable periods for a school
router.get('/periods', authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { schoolId } = req;

    const result = await query(
      `SELECT * FROM timetable_periods
       WHERE school_id = $1
       ORDER BY start_time`,
      [schoolId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching timetable periods:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch timetable periods' });
  }
});

// Create timetable entry
router.post('/', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const {
      course_id,
      teacher_id,
      day_of_week,
      period_id,
      grade,
      class_section,
      classroom,
      academic_year_id,
      term_id
    } = req.body;

    const result = await query(
      `INSERT INTO timetable_entries
       (school_id, course_id, teacher_id, day_of_week, period_id, grade, class_section, classroom, academic_year_id, term_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [schoolId, course_id, teacher_id, day_of_week, period_id, grade, class_section, classroom, academic_year_id, term_id]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error creating timetable entry:', err);
    res.status(500).json({ success: false, error: 'Failed to create timetable entry' });
  }
});

// Update timetable entry
router.put('/:id', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    const {
      course_id,
      teacher_id,
      day_of_week,
      period_id,
      grade,
      class_section,
      classroom,
      academic_year_id,
      term_id
    } = req.body;

    const result = await query(
      `UPDATE timetable_entries
       SET course_id = $1, teacher_id = $2, day_of_week = $3, period_id = $4,
           grade = $5, class_section = $6, classroom = $7, academic_year_id = $8, term_id = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND school_id = $11
       RETURNING *`,
      [course_id, teacher_id, day_of_week, period_id, grade, class_section, classroom, academic_year_id, term_id, id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Timetable entry not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error updating timetable entry:', err);
    res.status(500).json({ success: false, error: 'Failed to update timetable entry' });
  }
});

// Delete timetable entry
router.delete('/:id', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;

    const result = await query(
      'DELETE FROM timetable_entries WHERE id = $1 AND school_id = $2 RETURNING *',
      [id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Timetable entry not found' });
    }

    res.json({ success: true, message: 'Timetable entry deleted successfully' });
  } catch (err) {
    console.error('Error deleting timetable entry:', err);
    res.status(500).json({ success: false, error: 'Failed to delete timetable entry' });
  }
});

// Create timetable period
router.post('/periods', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { period_name, start_time, end_time, is_break } = req.body;

    const result = await query(
      `INSERT INTO timetable_periods (school_id, period_name, start_time, end_time, is_break)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [schoolId, period_name, start_time, end_time, is_break || false]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error creating timetable period:', err);
    res.status(500).json({ success: false, error: 'Failed to create timetable period' });
  }
});

// Update timetable period
router.put('/periods/:id', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    const { period_name, start_time, end_time, is_break } = req.body;

    const result = await query(
      `UPDATE timetable_periods
       SET period_name = $1, start_time = $2, end_time = $3, is_break = $4
       WHERE id = $5 AND school_id = $6
       RETURNING *`,
      [period_name, start_time, end_time, is_break, id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Timetable period not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error updating timetable period:', err);
    res.status(500).json({ success: false, error: 'Failed to update timetable period' });
  }
});

// Delete timetable period
router.delete('/periods/:id', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;

    const result = await query(
      'DELETE FROM timetable_periods WHERE id = $1 AND school_id = $2 RETURNING *',
      [id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Timetable period not found' });
    }

    res.json({ success: true, message: 'Timetable period deleted successfully' });
  } catch (err) {
    console.error('Error deleting timetable period:', err);
    res.status(500).json({ success: false, error: 'Failed to delete timetable period' });
  }
});

module.exports = router;