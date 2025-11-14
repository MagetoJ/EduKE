const express = require('express');
const { query } = require('../db/connection');

const secureRouter = express.Router();
const { authorizeRole, requireFeature } = require('../middleware/auth');

// --- Courses ---
secureRouter.get('/courses', authorizeRole(['admin', 'teacher', 'student', 'parent']), async (req, res) => {
  try {
    const { schoolId } = req;
    const result = await query('SELECT c.*, u.name as teacher_name FROM courses c LEFT JOIN users u ON c.teacher_id = u.id WHERE c.school_id = $1 ORDER BY c.name', [schoolId]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch courses' });
  }
});

secureRouter.get('/courses/:id', authorizeRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    const result = await query('SELECT c.*, u.name as teacher_name FROM courses c LEFT JOIN users u ON c.teacher_id = u.id WHERE c.id = $1 AND c.school_id = $2', [id, schoolId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching course:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch course' });
  }
});

secureRouter.post('/courses', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { name, code, grade, subject_area, teacher_id, description } = req.body;

    const yearRes = await query('SELECT id FROM academic_years WHERE school_id = $1 AND status = $2', [schoolId, 'active']);
    const academic_year_id = yearRes.rows[0]?.id || null;

    const result = await query(
      `INSERT INTO courses (school_id, name, code, grade, subject_area, teacher_id, academic_year_id, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING *`,
      [schoolId, name, code, grade, subject_area, teacher_id, academic_year_id, description]
    );
    
    res.status(201).json({ success: true, data: result.rows[0], message: 'Course created successfully' });
  } catch (err) {
    console.error('Error creating course:', err);
    res.status(500).json({ success: false, error: 'Failed to create course' });
  }
});

secureRouter.put('/courses/:id', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    const { name, code, grade, subject_area, teacher_id, description, is_active } = req.body;
    
    const result = await query(
      `UPDATE courses SET name = $1, code = $2, grade = $3, subject_area = $4, teacher_id = $5, description = $6, is_active = $7, updated_at = NOW()
       WHERE id = $8 AND school_id = $9 RETURNING *`,
      [name, code, grade, subject_area, teacher_id, description, is_active, id, schoolId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    res.json({ success: true, data: result.rows[0], message: 'Course updated successfully' });
  } catch (err) {
    console.error('Error updating course:', err);
    res.status(500).json({ success: false, error: 'Failed to update course' });
  }
});

secureRouter.delete('/courses/:id', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    
    await query('UPDATE courses SET is_active = false, updated_at = NOW() WHERE id = $1 AND school_id = $2', [id, schoolId]);
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (err) {
    console.error('Error deleting course:', err);
    res.status(500).json({ success: false, error: 'Failed to delete course' });
  }
});


// --- Schools ---
secureRouter.get('/schools', authorizeRole(['super_admin']), async (req, res) => {
  try {
    const result = await query('SELECT * FROM schools ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching schools:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch schools' });
  }
});

secureRouter.get('/schools/:id', authorizeRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM schools WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'School not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching school:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch school' });
  }
});

secureRouter.post('/schools', authorizeRole(['super_admin']), async (req, res) => {
  try {
    const { name, email, phone, address, city, state, country, curriculum, level, principal, grade_levels } = req.body;
    
    const result = await query(
      `INSERT INTO schools (name, email, phone, address, city, state, country, curriculum, level, principal, grade_levels, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
       RETURNING *`,
      [name, email, phone, address, city, state, country, curriculum, level, principal, JSON.stringify(grade_levels)]
    );
    
    res.status(201).json({ success: true, data: result.rows[0], message: 'School created successfully' });
  } catch (err) {
    console.error('Error creating school:', err);
    res.status(500).json({ success: false, error: 'Failed to create school' });
  }
});

secureRouter.put('/schools/:id', authorizeRole(['super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, city, state, country, curriculum, level, principal, grade_levels, status } = req.body;
    
    const result = await query(
      `UPDATE schools SET name = $1, email = $2, phone = $3, address = $4, city = $5, state = $6, country = $7, 
       curriculum = $8, level = $9, principal = $10, grade_levels = $11, status = $12, updated_at = NOW()
       WHERE id = $13 RETURNING *`,
      [name, email, phone, address, city, state, country, curriculum, level, principal, JSON.stringify(grade_levels), status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'School not found' });
    }
    
    res.json({ success: true, data: result.rows[0], message: 'School updated successfully' });
  } catch (err) {
    console.error('Error updating school:', err);
    res.status(500).json({ success: false, error: 'Failed to update school' });
  }
});

secureRouter.delete('/schools/:id', authorizeRole(['super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    await query('UPDATE schools SET status = $1, updated_at = NOW() WHERE id = $2', ['inactive', id]);
    res.json({ success: true, message: 'School deactivated successfully' });
  } catch (err) {
    console.error('Error deleting school:', err);
    res.status(500).json({ success: false, error: 'Failed to delete school' });
  }
});

// --- School Settings ---
secureRouter.get('/school/settings', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const result = await query('SELECT name, email, phone, address, logo_url, level, curriculum, grade_levels, primary_color, accent_color FROM schools WHERE id = $1', [schoolId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'School not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching school settings:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch school settings' });
  }
});

secureRouter.put('/school/settings', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { name, email, phone, address, logo_url, level, curriculum, grade_levels, primary_color, accent_color } = req.body;
    
    const sql = `
      UPDATE schools
      SET name = $1, email = $2, phone = $3, address = $4, logo_url = $5, level = $6, curriculum = $7, grade_levels = $8, primary_color = $9, accent_color = $10, updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `;
    
    const result = await query(sql, [name, email, phone, address, logo_url, level, curriculum, grade_levels, primary_color, accent_color, schoolId]);
    res.json({ success: true, data: result.rows[0], message: 'School settings updated successfully' });
  } catch (err) {
    console.error('Error updating school settings:', err);
    res.status(500).json({ success: false, error: 'Failed to update school settings' });
  }
});

// --- Users (Staff, Teachers, Parents) ---
secureRouter.get('/users', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { role } = req.query; // e.g., /api/users?role=teacher
    
    let sql = "SELECT id, email, first_name, last_name, name, phone, role, status, avatar_url, class_assigned, subject FROM users WHERE school_id = $1";
    const params = [schoolId];
    
    if (role) {
      sql += " AND role = $2";
      params.push(role);
    }
    
    sql += " ORDER BY name";
    
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

secureRouter.post('/users', authorizeRole(['admin']), async (req, res) => {
  // This route is for creating staff, teachers, parents. Student creation is separate.
  // Note: Password must be set via an invite/setup link, not directly here for security.
  // This is a simplified version.
  try {
    const { schoolId } = req;
    const { email, first_name, last_name, phone, role, class_assigned, subject } = req.body;
    
    // Create a temporary or random password
    const tempPassword = "password123"; // TODO: Replace with a secure random password
    const password_hash = await bcrypt.hash(tempPassword, 10);
    const name = `${first_name} ${last_name}`.trim();
    
    const sql = `
      INSERT INTO users (school_id, email, password_hash, first_name, last_name, name, phone, role, class_assigned, subject, status, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', false)
      RETURNING id, email, first_name, last_name, name, phone, role, status
    `;
    
    const result = await query(sql, [schoolId, email, password_hash, first_name, last_name, name, phone, role, class_assigned, subject]);
    
    // TODO: Send an email invite to this user to set their password
    
    res.status(201).json({ success: true, data: result.rows[0], message: 'User created successfully. Invite email sent.' });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

// --- Staff ---
secureRouter.get('/staff', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const result = await query("SELECT id, email, first_name, last_name, name, phone, role, status, avatar_url, department, employee_id, hire_date FROM users WHERE school_id = $1 AND role IN ('admin', 'teacher')", [schoolId]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching staff:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch staff' });
  }
});

// --- Students ---
secureRouter.get('/students', authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { schoolId } = req;
    const result = await query('SELECT * FROM students WHERE school_id = $1 ORDER BY first_name', [schoolId]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch students' });
  }
});

secureRouter.post('/students', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { first_name, last_name, email, grade, parent_id, admission_number } = req.body;
    
    // TODO: Add logic to check student limit based on subscription
    
    const sql = `
      INSERT INTO students (school_id, first_name, last_name, email, grade, parent_id, admission_number, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING *
    `;
    
    const result = await query(sql, [schoolId, first_name, last_name, email, grade, parent_id, admission_number]);
    res.status(201).json({ success: true, data: result.rows[0], message: 'Student created successfully' });
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(500).json({ success: false, error: 'Failed to create student' });
  }
});

secureRouter.put('/students/:id', authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { schoolId } = req;
    const { first_name, last_name, email, grade, parent_id, admission_number, status } = req.body;
    
    const sql = `
      UPDATE students
      SET first_name = $1, last_name = $2, email = $3, grade = $4, parent_id = $5, admission_number = $6, status = $7, updated_at = NOW()
      WHERE id = $8 AND school_id = $9
      RETURNING *
    `;
    
    const result = await query(sql, [first_name, last_name, email, grade, parent_id, admission_number, status, id, schoolId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Student not found or access denied' });
    }
    
    res.json({ success: true, data: result.rows[0], message: 'Student updated successfully' });
  } catch (err) {
    console.error('Error updating student:', err);
    res.status(500).json({ success: false, error: 'Failed to update student' });
  }
});

// --- Assignments ---
secureRouter.get('/assignments', authorizeRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const { schoolId, user } = req;
    let sql = 'SELECT a.*, c.name as course_name FROM assignments a JOIN courses c ON a.course_id = c.id WHERE c.school_id = $1';
    const params = [schoolId];
    
    if (user.role === 'teacher') {
      sql += ' AND c.teacher_id = $2';
      params.push(user.id);
    }
    
    sql += ' ORDER BY a.due_date DESC';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch assignments' });
  }
});

secureRouter.post('/assignments', authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { course_id, title, description, due_date, max_score, assignment_type } = req.body;
    
    const result = await query(
      'INSERT INTO assignments (school_id, course_id, title, description, due_date, max_score, assignment_type, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [schoolId, course_id, title, description, due_date, max_score, assignment_type, 'active']
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error creating assignment:', err);
    res.status(500).json({ success: false, error: 'Failed to create assignment' });
  }
});

// --- Exams ---
secureRouter.get('/exams', authorizeRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const { schoolId } = req;
    const result = await query(
      'SELECT e.*, c.name as course_name FROM exams e JOIN courses c ON e.course_id = c.id WHERE c.school_id = $1 ORDER BY e.exam_date DESC',
      [schoolId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching exams:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch exams' });
  }
});

secureRouter.post('/exams', authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { course_id, name, exam_date, total_marks, duration_minutes } = req.body;
    
    const result = await query(
      'INSERT INTO exams (school_id, course_id, name, exam_date, total_marks, duration_minutes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [schoolId, course_id, name, exam_date, total_marks, duration_minutes]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error creating exam:', err);
    res.status(500).json({ success: false, error: 'Failed to create exam' });
  }
});

// --- Attendance ---
secureRouter.get('/attendance', authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { date, course_id } = req.query;
    
    let sql = 'SELECT a.*, s.first_name, s.last_name FROM attendance a JOIN students s ON a.student_id = s.id WHERE a.school_id = $1';
    const params = [schoolId];
    let paramIndex = 2;
    
    if (date) {
      sql += ` AND a.date = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }
    
    if (course_id) {
      sql += ` AND a.course_id = $${paramIndex}`;
      params.push(course_id);
    }
    
    sql += ' ORDER BY a.date DESC, s.first_name';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch attendance' });
  }
});

secureRouter.post('/attendance', authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { records } = req.body; // Array of {student_id, date, status, course_id}
    
    const results = [];
    for (const record of records) {
      const result = await query(
        'INSERT INTO attendance (school_id, student_id, date, status, course_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (school_id, student_id, date, course_id) DO UPDATE SET status = $4, updated_at = NOW() RETURNING *',
        [schoolId, record.student_id, record.date, record.status, record.course_id]
      );
      results.push(result.rows[0]);
    }
    
    res.status(201).json({ success: true, data: results });
  } catch (err) {
    console.error('Error recording attendance:', err);
    res.status(500).json({ success: false, error: 'Failed to record attendance' });
  }
});

// --- Fees ---
secureRouter.get('/fees', authorizeRole(['admin', 'parent']), async (req, res) => {
  try {
    const { schoolId, user } = req;
    let sql = 'SELECT sf.*, s.first_name, s.last_name, fs.fee_type FROM student_fees sf JOIN students s ON sf.student_id = s.id JOIN fee_structures fs ON sf.fee_structure_id = fs.id WHERE sf.school_id = $1';
    const params = [schoolId];
    
    if (user.role === 'parent') {
      sql += ' AND s.parent_id = $2';
      params.push(user.id);
    }
    
    sql += ' ORDER BY sf.due_date DESC';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching fees:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch fees' });
  }
});

secureRouter.post('/fees/payment', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { student_fee_id, amount, payment_method, reference_number } = req.body;
    
    const feePayment = await query(
      'INSERT INTO fee_payments (student_fee_id, amount, payment_method, payment_date, reference_number) VALUES ($1, $2, $3, NOW(), $4) RETURNING *',
      [student_fee_id, amount, payment_method, reference_number]
    );
    
    await query(
      'UPDATE student_fees SET amount_paid = amount_paid + $1, payment_status = CASE WHEN amount_paid + $1 >= amount_due THEN \'paid\' WHEN amount_paid + $1 > 0 THEN \'partial\' ELSE payment_status END WHERE id = $2',
      [amount, student_fee_id]
    );
    
    res.status(201).json({ success: true, data: feePayment.rows[0] });
  } catch (err) {
    console.error('Error recording payment:', err);
    res.status(500).json({ success: false, error: 'Failed to record payment' });
  }
});

// --- Messages/Communications ---
secureRouter.get('/messages', authorizeRole(['admin', 'teacher', 'parent', 'student']), async (req, res) => {
  try {
    const { schoolId, user } = req;
    const result = await query(
      'SELECT m.*, u.name as sender_name, mr.is_read FROM messages m LEFT JOIN users u ON m.sender_id = u.id LEFT JOIN message_recipients mr ON m.id = mr.message_id AND mr.recipient_id = $1 WHERE m.school_id = $2 ORDER BY m.created_at DESC LIMIT 50',
      [user.id, schoolId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

secureRouter.post('/messages', authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { schoolId, user } = req;
    const { title, content, recipient_type, recipient_ids } = req.body;
    
    const message = await query(
      'INSERT INTO messages (school_id, sender_id, title, content, recipient_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [schoolId, user.id, title, content, recipient_type]
    );
    
    for (const recipientId of recipient_ids) {
      await query(
        'INSERT INTO message_recipients (message_id, recipient_id) VALUES ($1, $2)',
        [message.rows[0].id, recipientId]
      );
    }
    
    res.status(201).json({ success: true, data: message.rows[0] });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// --- Dashboard Stats ---
secureRouter.get('/dashboard/stats', authorizeRole(['admin', 'teacher', 'student', 'parent']), async (req, res) => {
  try {
    const { schoolId, user } = req;
    
    if (user.role === 'admin') {
      const students = await query('SELECT COUNT(*) FROM students WHERE school_id = $1 AND status = $2', [schoolId, 'active']);
      const teachers = await query('SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = $2', [schoolId, 'teacher']);
      const courses = await query('SELECT COUNT(*) FROM courses WHERE school_id = $1 AND is_active = $2', [schoolId, true]);
      const fees = await query('SELECT SUM(amount_due) as total_due, SUM(amount_paid) as total_paid FROM student_fees WHERE school_id = $1', [schoolId]);
      
      res.json({ success: true, data: {
        students: parseInt(students.rows[0].count),
        teachers: parseInt(teachers.rows[0].count),
        courses: parseInt(courses.rows[0].count),
        fees: fees.rows[0]
      }});
    } else if (user.role === 'teacher') {
      const courses = await query('SELECT COUNT(*) FROM courses WHERE school_id = $1 AND teacher_id = $2', [schoolId, user.id]);
      const assignments = await query('SELECT COUNT(*) FROM assignments a JOIN courses c ON a.course_id = c.id WHERE c.school_id = $1 AND c.teacher_id = $2', [schoolId, user.id]);
      
      res.json({ success: true, data: {
        courses: parseInt(courses.rows[0].count),
        assignments: parseInt(assignments.rows[0].count)
      }});
    } else {
      res.json({ success: true, data: {} });
    }
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// --- Reports ---
function getMonthName(monthStr) {
  const [year, month] = monthStr.split('-');
  return new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
}

secureRouter.get('/reports/financial-summary', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { rows } = await query(`
      SELECT 
        payment_status, 
        SUM(amount_due) as total_due,
        SUM(amount_paid) as total_paid,
        COUNT(*) as invoice_count
      FROM student_fees 
      WHERE school_id = $1
      GROUP BY payment_status;
    `, [schoolId]);
    
    const summary = {
      paid: rows.find(r => r.payment_status === 'paid') || { total_paid: 0, invoice_count: 0 },
      pending: rows.find(r => r.payment_status === 'pending') || { total_due: 0, invoice_count: 0 },
      partial: rows.find(r => r.payment_status === 'partial') || { total_due: 0, total_paid: 0, invoice_count: 0 },
      overdue: rows.find(r => r.payment_status === 'overdue') || { total_due: 0, invoice_count: 0 }
    };

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching financial-summary:', error);
    res.status(500).json({ error: error.message });
  }
});

secureRouter.get('/reports/performance-summary', authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { rows } = await query(`
      SELECT 
        grade, 
        AVG(percentage) as average_score
      FROM exam_results er
      JOIN students s ON er.student_id = s.id
      WHERE s.school_id = $1
      GROUP BY s.grade
      ORDER BY s.grade ASC;
    `, [schoolId]);
    
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching performance-summary:', error);
    res.status(500).json({ error: error.message });
  }
});

secureRouter.get('/reports/school-analytics', authorizeRole(['super_admin']), async (req, res) => {
  try {
    const newSchoolsByMonth = (await query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month, 
        COUNT(*) as newSchools 
      FROM schools 
      GROUP BY month 
      ORDER BY month ASC`
    )).rows;

    let totalSchools = 0;
    const formattedData = newSchoolsByMonth.map((row) => {
      totalSchools += parseInt(row.newschools, 10); // PostgreSQL returns lowercase
      return {
        month: getMonthName(row.month),
        newSchools: parseInt(row.newschools, 10),
        totalSchools,
        activeSchools: totalSchools // This logic might need refinement based on 'status'
      };
    });

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching school-analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

secureRouter.get('/reports/subscription-status', authorizeRole(['super_admin']), async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT 
        sp.name as plan,
        sp.slug,
        COUNT(DISTINCT s.school_id) as subscribers,
        COALESCE(SUM(sp.price), 0) as revenue,
        s.status
      FROM subscription_plans sp
      LEFT JOIN subscriptions s ON sp.id = s.plan_id
      GROUP BY sp.id, sp.name, sp.slug, sp.price, s.status
      ORDER BY sp.price DESC
    `);
    
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching subscription-status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = { secureRouter };
