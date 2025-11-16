const { query } = require('../db/connection');

/**
 * Get all exams
 */
const getAllExams = async (req, res) => {
  try {
    const { schoolId } = req;
    const result = await query(
      'SELECT e.*, c.name as course_name, c.grade FROM exams e JOIN courses c ON e.course_id = c.id WHERE c.school_id = $1 ORDER BY e.exam_date DESC',
      [schoolId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch exams' });
  }
};

/**
 * Get single exam
 */
const getExamById = async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    const result = await query(
      'SELECT e.*, c.name as course_name, c.grade FROM exams e JOIN courses c ON e.course_id = c.id WHERE e.id = $1 AND c.school_id = $2',
      [id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch exam' });
  }
};

/**
 * Create exam
 */
const createExam = async (req, res) => {
  try {
    const { schoolId } = req;
    const { course_id, name, exam_date, total_marks, duration_minutes, description } = req.body;

    const result = await query(
      'INSERT INTO exams (school_id, course_id, name, exam_date, total_marks, duration_minutes, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [schoolId, course_id, name, exam_date, total_marks, duration_minutes, description]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Exam created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create exam' });
  }
};

/**
 * Update exam
 */
const updateExam = async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    const { name, exam_date, total_marks, duration_minutes, description } = req.body;

    const result = await query(
      'UPDATE exams SET name = $1, exam_date = $2, total_marks = $3, duration_minutes = $4, description = $5, updated_at = NOW() WHERE id = $6 AND school_id = $7 RETURNING *',
      [name, exam_date, total_marks, duration_minutes, description, id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Exam updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update exam' });
  }
};

/**
 * Delete exam
 */
const deleteExam = async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;

    await query('DELETE FROM exams WHERE id = $1 AND school_id = $2', [id, schoolId]);
    res.json({ success: true, message: 'Exam deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete exam' });
  }
};

/**
 * Post exam results
 */
const postExamResults = async (req, res) => {
  try {
    const { id } = req.params;
    const { results } = req.body; // Array of {student_id, score, percentage, grade, remarks}

    const insertedResults = [];
    for (const result of results) {
      const inserted = await query(
        `INSERT INTO exam_results (exam_id, student_id, score, percentage, grade, remarks)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (exam_id, student_id)
         DO UPDATE SET score = $3, percentage = $4, grade = $5, remarks = $6, updated_at = NOW()
         RETURNING *`,
        [id, result.student_id, result.score, result.percentage, result.grade, result.remarks]
      );
      insertedResults.push(inserted.rows[0]);
    }

    res.status(201).json({ success: true, data: insertedResults, message: 'Results posted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to post results' });
  }
};

module.exports = {
  getAllExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  postExamResults
};