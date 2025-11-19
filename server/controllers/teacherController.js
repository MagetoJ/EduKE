const { query } = require('../db/connection');

/**
 * Get all teachers
 */
const getAllTeachers = async (req, res) => {
  try {
    const { schoolId, user, isSuperAdmin } = req;
    let sql = 'SELECT id, name FROM users WHERE role = $1';
    const params = ['teacher'];

    // Filter by school if schoolId is provided
    if (schoolId) {
      sql += ' AND school_id = $2';
      params.push(schoolId);
    }

    sql += ' ORDER BY name';

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching teachers:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch teachers' });
  }
};

// Get attendance roster for a teacher's class
const getAttendanceRoster = async (req, res) => {
  try {
    const db = getDatabase();
    const { date } = req.query;
    const teacherId = req.user.id;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date is required'
      });
    }

    // Get teacher's assigned class
    const teacherQuery = 'SELECT class_assigned FROM users WHERE id = $1';
    const teacher = await db.oneOrNone(teacherQuery, [teacherId]);

    if (!teacher || !teacher.class_assigned) {
      return res.status(400).json({
        success: false,
        error: 'Teacher has no assigned class'
      });
    }

    const classId = teacher.class_assigned;

    // Get students in the teacher's class
    const studentsQuery = `
      SELECT s.id, s.first_name, s.last_name, s.admission_number,
             COALESCE(a.status, 'absent') as status
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id
        AND a.date = $1
        AND a.class_id = $2
      WHERE s.class_assigned = $2
      ORDER BY s.first_name, s.last_name
    `;

    const students = await db.any(studentsQuery, [date, classId]);

    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Error fetching attendance roster:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance roster'
    });
  }
};

// Mark attendance for students
const markAttendance = async (req, res) => {
  try {
    const db = getDatabase();
    const { date, attendance } = req.body;
    const teacherId = req.user.id;

    if (!date || !Array.isArray(attendance)) {
      return res.status(400).json({
        success: false,
        error: 'Date and attendance array are required'
      });
    }

    // Get teacher's assigned class
    const teacherQuery = 'SELECT class_assigned FROM users WHERE id = $1';
    const teacher = await db.oneOrNone(teacherQuery, [teacherId]);

    if (!teacher || !teacher.class_assigned) {
      return res.status(400).json({
        success: false,
        error: 'Teacher has no assigned class'
      });
    }

    const classId = teacher.class_assigned;

    // Begin transaction
    await db.tx(async (t) => {
      // Delete existing attendance for this date/class
      await t.none('DELETE FROM attendance WHERE date = $1 AND class_id = $2', [date, classId]);

      // Insert new attendance records
      if (attendance.length > 0) {
        const attendanceValues = attendance.map(record => ({
          student_id: record.studentId,
          date: date,
          class_id: classId,
          status: record.status.toLowerCase(),
          marked_by: teacherId
        }));

        const cs = new t.helpers.ColumnSet(['student_id', 'date', 'class_id', 'status', 'marked_by'], { table: 'attendance' });
        await t.none(cs.insert(attendanceValues));
      }
    });

    res.json({
      success: true,
      message: 'Attendance marked successfully'
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark attendance'
    });
  }
};

// Submit a grade for a student
const submitGrade = async (req, res) => {
  try {
    const db = getDatabase();
    const { studentId, assignmentId, score, grade, comments } = req.body;
    const teacherId = req.user.id;

    if (!studentId || !assignmentId || score === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Student ID, assignment ID, and score are required'
      });
    }

    // Insert or update performance record
    const query = `
      INSERT INTO performance (student_id, assignment_id, score, grade, comments, submitted_by, submitted_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (student_id, assignment_id)
      DO UPDATE SET
        score = EXCLUDED.score,
        grade = EXCLUDED.grade,
        comments = EXCLUDED.comments,
        submitted_by = EXCLUDED.submitted_by,
        submitted_at = NOW()
    `;

    await db.none(query, [studentId, assignmentId, score, grade || null, comments || null, teacherId]);

    res.json({
      success: true,
      message: 'Grade submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting grade:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit grade'
    });
  }
};

module.exports = {
  getAllTeachers,
  getAttendanceRoster,
  markAttendance,
  submitGrade
};