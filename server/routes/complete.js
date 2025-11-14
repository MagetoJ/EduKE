const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { query } = require('../db/connection');
const { authorizeRole } = require('../middleware/auth');

// ===================
// EXAMS ROUTES
// ===================

// Get all exams
router.get('/exams', authorizeRole(['admin', 'teacher', 'student']), async (req, res) => {
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
});

// Create exam
router.post('/exams', authorizeRole(['admin', 'teacher']), async (req, res) => {
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
});

// Update exam
router.put('/exams/:id', authorizeRole(['admin', 'teacher']), async (req, res) => {
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
});

// Delete exam
router.delete('/exams/:id', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    
    await query('DELETE FROM exams WHERE id = $1 AND school_id = $2', [id, schoolId]);
    res.json({ success: true, message: 'Exam deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete exam' });
  }
});

// Post exam results
router.post('/exams/:id/results', authorizeRole(['admin', 'teacher']), async (req, res) => {
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
});

// ===================
// STAFF ROUTES
// ===================

// Get all staff
router.get('/staff', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const result = await query(
      "SELECT id, email, first_name, last_name, name, phone, role, status, avatar_url, department, employee_id, hire_date, subject, class_assigned FROM users WHERE school_id = $1 AND role IN ('admin', 'teacher') ORDER BY name",
      [schoolId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch staff' });
  }
});

// Create staff member
router.post('/staff', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { email, first_name, last_name, phone, role, department, subject, class_assigned } = req.body;
    
    const tempPassword = `staff${Math.random().toString(36).slice(-8)}`;
    const password_hash = await bcrypt.hash(tempPassword, 10);
    const name = `${first_name} ${last_name}`;
    
    const result = await query(
      `INSERT INTO users (school_id, email, password_hash, first_name, last_name, name, phone, role, department, subject, class_assigned, status, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', false)
       RETURNING id, email, first_name, last_name, name, phone, role, status, department`,
      [schoolId, email, password_hash, first_name, last_name, name, phone, role, department, subject, class_assigned]
    );
    
    res.status(201).json({ success: true, data: result.rows[0], message: 'Staff member created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create staff member' });
  }
});

// Update staff member
router.put('/staff/:id', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    const { first_name, last_name, phone, department, subject, class_assigned, status } = req.body;
    
    const result = await query(
      `UPDATE users SET first_name = $1, last_name = $2, name = $3, phone = $4, department = $5, subject = $6, class_assigned = $7, status = $8, updated_at = NOW()
       WHERE id = $9 AND school_id = $10 RETURNING *`,
      [first_name, last_name, `${first_name} ${last_name}`, phone, department, subject, class_assigned, status, id, schoolId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }
    
    res.json({ success: true, data: result.rows[0], message: 'Staff member updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update staff member' });
  }
});

// Delete staff member
router.delete('/staff/:id', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    
    await query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 AND school_id = $3', ['inactive', id, schoolId]);
    res.json({ success: true, message: 'Staff member deactivated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete staff member' });
  }
});

// ===================
// FEE STRUCTURES
// ===================

// Get fee structures
router.get('/fee-structures', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const result = await query('SELECT * FROM fee_structures WHERE school_id = $1 ORDER BY created_at DESC', [schoolId]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch fee structures' });
  }
});

// Create fee structure
router.post('/fee-structures', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { fee_type, amount, grade, term, academic_year, description } = req.body;
    
    const result = await query(
      'INSERT INTO fee_structures (school_id, fee_type, amount, grade, term, academic_year, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [schoolId, fee_type, amount, grade, term, academic_year, description]
    );
    
    res.status(201).json({ success: true, data: result.rows[0], message: 'Fee structure created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create fee structure' });
  }
});

// Assign fees to students
router.post('/assign-fees', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { fee_structure_id, student_ids, due_date } = req.body;
    
    const assigned = [];
    for (const student_id of student_ids) {
      const result = await query(
        'INSERT INTO student_fees (school_id, student_id, fee_structure_id, amount_due, due_date, payment_status) SELECT $1, $2, $3, amount, $4, \'pending\' FROM fee_structures WHERE id = $3 RETURNING *',
        [schoolId, student_id, fee_structure_id, due_date]
      );
      assigned.push(result.rows[0]);
    }
    
    res.status(201).json({ success: true, data: assigned, message: 'Fees assigned successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to assign fees' });
  }
});

// ===================
// MESSAGES
// ===================

// Mark message as read
router.put('/messages/:id/read', authorizeRole(['admin', 'teacher', 'parent', 'student']), async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    
    await query(
      'UPDATE message_recipients SET is_read = true, read_at = NOW() WHERE message_id = $1 AND recipient_id = $2',
      [id, user.id]
    );
    
    res.json({ success: true, message: 'Message marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to mark message as read' });
  }
});

// Delete message
router.delete('/messages/:id', authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    
    await query('DELETE FROM messages WHERE id = $1 AND school_id = $2', [id, schoolId]);
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});

// ===================
// ACADEMIC YEARS
// ===================

// Get academic years
router.get('/academic-years', authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { schoolId } = req;
    const result = await query('SELECT * FROM academic_years WHERE school_id = $1 ORDER BY start_date DESC', [schoolId]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch academic years' });
  }
});

// Create academic year
router.post('/academic-years', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { name, start_date, end_date } = req.body;
    
    const result = await query(
      'INSERT INTO academic_years (school_id, name, start_date, end_date, status) VALUES ($1, $2, $3, $4, \'active\') RETURNING *',
      [schoolId, name, start_date, end_date]
    );
    
    res.status(201).json({ success: true, data: result.rows[0], message: 'Academic year created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create academic year' });
  }
});

// End academic year
router.post('/academic-years/:id/end', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    
    await query('UPDATE academic_years SET status = $1, updated_at = NOW() WHERE id = $2 AND school_id = $3', ['completed', id, schoolId]);
    res.json({ success: true, message: 'Academic year ended successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to end academic year' });
  }
});

// ===================
// DISCIPLINE
// ===================

// Get discipline records
router.get('/discipline', authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { schoolId } = req;
    const result = await query(
      'SELECT d.*, s.first_name, s.last_name FROM discipline d JOIN students s ON d.student_id = s.id WHERE d.school_id = $1 ORDER BY d.incident_date DESC',
      [schoolId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch discipline records' });
  }
});

// Create discipline record
router.post('/discipline', authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { schoolId, user } = req;
    const { student_id, incident_type, description, action_taken, incident_date } = req.body;
    
    const result = await query(
      'INSERT INTO discipline (school_id, student_id, incident_type, description, action_taken, incident_date, reported_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [schoolId, student_id, incident_type, description, action_taken, incident_date, user.id]
    );
    
    res.status(201).json({ success: true, data: result.rows[0], message: 'Discipline record created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create discipline record' });
  }
});

// ===================
// LEAVE
// ===================

// Get leave types
router.get('/leave-types', authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { schoolId } = req;
    const result = await query('SELECT * FROM leave_types WHERE school_id = $1', [schoolId]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch leave types' });
  }
});

// Get leave requests
router.get('/leave-requests', authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { schoolId, user } = req;
    let sql = 'SELECT lr.*, u.name as staff_name, lt.name as leave_type_name FROM leave_requests lr JOIN users u ON lr.user_id = u.id JOIN leave_types lt ON lr.leave_type_id = lt.id WHERE lr.school_id = $1';
    const params = [schoolId];
    
    if (user.role === 'teacher') {
      sql += ' AND lr.user_id = $2';
      params.push(user.id);
    }
    
    sql += ' ORDER BY lr.created_at DESC';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch leave requests' });
  }
});

// Create leave request
router.post('/leave-requests', authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { schoolId, user } = req;
    const { leave_type_id, start_date, end_date, reason } = req.body;
    
    const result = await query(
      'INSERT INTO leave_requests (school_id, user_id, leave_type_id, start_date, end_date, reason, status) VALUES ($1, $2, $3, $4, $5, $6, \'pending\') RETURNING *',
      [schoolId, user.id, leave_type_id, start_date, end_date, reason]
    );
    
    res.status(201).json({ success: true, data: result.rows[0], message: 'Leave request submitted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create leave request' });
  }
});

// Approve/Reject leave
router.put('/leave-requests/:id/status', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId, user } = req;
    const { id } = req.params;
    const { status, admin_remarks } = req.body;
    
    const result = await query(
      'UPDATE leave_requests SET status = $1, admin_remarks = $2, approved_by = $3, approved_at = NOW(), updated_at = NOW() WHERE id = $4 AND school_id = $5 RETURNING *',
      [status, admin_remarks, user.id, id, schoolId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }
    
    res.json({ success: true, data: result.rows[0], message: `Leave request ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update leave request' });
  }
});

// ===================
// SUBSCRIPTIONS (Super Admin)
// ===================

// Get all subscriptions
router.get('/subscriptions', authorizeRole(['super_admin']), async (req, res) => {
  try {
    const result = await query(
      `SELECT s.*, sch.name as school_name, sp.name as plan_name, sp.price
       FROM subscriptions s
       JOIN schools sch ON s.school_id = sch.id
       JOIN subscription_plans sp ON s.plan_id = sp.id
       ORDER BY s.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch subscriptions' });
  }
});

// Get subscription plans
router.get('/subscription-plans', authorizeRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const result = await query('SELECT * FROM subscription_plans ORDER BY price ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch subscription plans' });
  }
});

// Change school subscription (Super Admin)
router.put('/subscriptions/:schoolId/change-plan', authorizeRole(['super_admin']), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { plan_id } = req.body;
    
    // Get plan details
    const plan = await query('SELECT * FROM subscription_plans WHERE id = $1', [plan_id]);
    if (plan.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }
    
    // Check if subscription exists
    const existing = await query('SELECT id FROM subscriptions WHERE school_id = $1', [schoolId]);
    
    if (existing.rows.length > 0) {
      // Update existing subscription
      const result = await query(
        `UPDATE subscriptions 
         SET plan_id = $1, status = 'active', updated_at = NOW()
         WHERE school_id = $2
         RETURNING *`,
        [plan_id, schoolId]
      );
      res.json({ success: true, data: result.rows[0], message: 'Subscription updated successfully' });
    } else {
      // Create new subscription
      const result = await query(
        `INSERT INTO subscriptions (school_id, plan_id, status, start_date)
         VALUES ($1, $2, 'active', NOW())
         RETURNING *`,
        [schoolId, plan_id]
      );
      res.status(201).json({ success: true, data: result.rows[0], message: 'Subscription created successfully' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to change subscription' });
  }
});

// Cancel subscription (Super Admin)
router.put('/subscriptions/:schoolId/cancel', authorizeRole(['super_admin']), async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    await query(
      `UPDATE subscriptions 
       SET status = 'cancelled', end_date = NOW(), updated_at = NOW()
       WHERE school_id = $1`,
      [schoolId]
    );
    
    res.json({ success: true, message: 'Subscription cancelled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
  }
});

// Renew subscription (Super Admin)
router.post('/subscriptions/:schoolId/renew', authorizeRole(['super_admin']), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { plan_id, duration_months } = req.body;
    
    const newEndDate = new Date();
    newEndDate.setMonth(newEndDate.getMonth() + (duration_months || 12));
    
    const result = await query(
      `UPDATE subscriptions 
       SET plan_id = $1, status = 'active', end_date = $2, updated_at = NOW()
       WHERE school_id = $3
       RETURNING *`,
      [plan_id, newEndDate.toISOString(), schoolId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }
    
    res.json({ success: true, data: result.rows[0], message: 'Subscription renewed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to renew subscription' });
  }
});

// Get school's current subscription
router.get('/school/subscription', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const result = await query(
      `SELECT s.*, sp.name as plan_name, sp.slug, sp.price, sp.max_students, sp.max_staff
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.school_id = $1 AND s.status IN ('active', 'trial')
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [schoolId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No active subscription found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
  }
});

// ===================
// USER MANAGEMENT (Admin creating staff/teachers)
// ===================

// Create user/staff member by admin
router.post('/users', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { email, first_name, last_name, phone, role, department, subject, class_assigned } = req.body;
    
    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Email already in use' });
    }
    
    const tempPassword = `temp${Math.random().toString(36).slice(-8)}`;
    const password_hash = await bcrypt.hash(tempPassword, 10);
    const name = `${first_name} ${last_name}`;
    
    const result = await query(
      `INSERT INTO users (school_id, email, password_hash, first_name, last_name, name, phone, role, department, subject, class_assigned, status, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', false)
       RETURNING id, email, first_name, last_name, name, phone, role, status`,
      [schoolId, email, password_hash, first_name, last_name, name, phone, role, department, subject, class_assigned]
    );
    
    res.status(201).json({ 
      success: true, 
      data: result.rows[0], 
      message: 'User created successfully. Credentials sent via email.',
      tempPassword: tempPassword // In production, send via email instead
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

// Update user by admin
router.put('/users/:id', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    const { first_name, last_name, phone, department, subject, class_assigned, status } = req.body;
    
    const result = await query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, name = $3, phone = $4, department = $5, subject = $6, class_assigned = $7, status = $8, updated_at = NOW()
       WHERE id = $9 AND school_id = $10
       RETURNING *`,
      [first_name, last_name, `${first_name} ${last_name}`, phone, department, subject, class_assigned, status, id, schoolId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, data: result.rows[0], message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// Delete user by admin
router.delete('/users/:id', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    
    await query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 AND school_id = $3', ['inactive', id, schoolId]);
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// Get all users for school admin
router.get('/users', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { role } = req.query;
    
    let sql = "SELECT id, email, first_name, last_name, name, phone, role, status, avatar_url, department, subject, class_assigned FROM users WHERE school_id = $1";
    const params = [schoolId];
    
    if (role) {
      sql += " AND role = $2";
      params.push(role);
    }
    
    sql += " ORDER BY name";
    
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// ===================
// TIMETABLE
// ===================

// Get timetable
router.get('/timetable', authorizeRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { grade, day } = req.query;
    
    let sql = 'SELECT t.*, c.name as course_name, u.name as teacher_name, tp.name as period_name FROM timetable_entries t JOIN courses c ON t.course_id = c.id LEFT JOIN users u ON c.teacher_id = u.id JOIN timetable_periods tp ON t.period_id = tp.id WHERE t.school_id = $1';
    const params = [schoolId];
    let paramIndex = 2;
    
    if (grade) {
      sql += ` AND t.grade = $${paramIndex}`;
      params.push(grade);
      paramIndex++;
    }
    
    if (day) {
      sql += ` AND t.day_of_week = $${paramIndex}`;
      params.push(day);
    }
    
    sql += ' ORDER BY t.day_of_week, tp.start_time';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch timetable' });
  }
});

// Get timetable periods
router.get('/timetable-periods', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const result = await query('SELECT * FROM timetable_periods WHERE school_id = $1 ORDER BY start_time', [schoolId]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch timetable periods' });
  }
});

// Create timetable entry
router.post('/timetable', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { course_id, period_id, day_of_week, grade, room } = req.body;
    
    const result = await query(
      'INSERT INTO timetable_entries (school_id, course_id, period_id, day_of_week, grade, room) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [schoolId, course_id, period_id, day_of_week, grade, room]
    );
    
    res.status(201).json({ success: true, data: result.rows[0], message: 'Timetable entry created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create timetable entry' });
  }
});

// Delete timetable entry
router.delete('/timetable/:id', authorizeRole(['admin']), async (req, res) => {
  try {
    const { schoolId } = req;
    const { id } = req.params;
    
    await query('DELETE FROM timetable_entries WHERE id = $1 AND school_id = $2', [id, schoolId]);
    res.json({ success: true, message: 'Timetable entry deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete timetable entry' });
  }
});

module.exports = router;
