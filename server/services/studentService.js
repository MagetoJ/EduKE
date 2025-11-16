/**
 * Student Service
 * Business logic for student management
 */

const { query, transaction } = require('../db/connection');
const bcrypt = require('bcrypt');

/**
 * Get all students for a school
 */
const getStudents = async (schoolId, filters = {}) => {
  let sql = `
    SELECT 
      s.*,
      u.email as parent_email,
      u.name as parent_name,
      u.phone as parent_phone
    FROM students s
    LEFT JOIN users u ON s.parent_id = u.id
    WHERE s.school_id = $1
  `;
  
  const params = [schoolId];
  let paramIndex = 2;
  
  if (filters.grade) {
    sql += ` AND s.grade = $${paramIndex}`;
    params.push(filters.grade);
    paramIndex++;
  }
  
  if (filters.status) {
    sql += ` AND s.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }
  
  if (filters.search) {
    sql += ` AND (s.first_name ILIKE $${paramIndex} OR s.last_name ILIKE $${paramIndex} OR s.admission_number ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }
  
  sql += ` ORDER BY s.first_name, s.last_name`;
  
  const result = await query(sql, params);
  return result.rows;
};

/**
 * Get student by ID
 */
const getStudentById = async (studentId, schoolId) => {
  const result = await query(
    `SELECT 
      s.*,
      u.email as parent_email,
      u.name as parent_name,
      u.phone as parent_phone
    FROM students s
    LEFT JOIN users u ON s.parent_id = u.id
    WHERE s.id = $1 AND s.school_id = $2`,
    [studentId, schoolId]
  );
  
  return result.rows[0];
};

/**
 * Create new student
 */
const createStudent = async (schoolId, studentData) => {
  return await transaction(async (client) => {
    // Check subscription limits (simplified - you can expand this)
    const studentCount = await client.query(
      'SELECT COUNT(*) FROM students WHERE school_id = $1 AND status = $2',
      [schoolId, 'active']
    );
    
    const subscription = await client.query(
      `SELECT sp.student_limit
       FROM subscriptions sub
       JOIN subscription_plans sp ON sub.plan_id = sp.id
       WHERE sub.school_id = $1 AND sub.status IN ('active', 'trial')
       LIMIT 1`,
      [schoolId]
    );

    if (subscription.rows.length > 0) {
      const studentLimit = subscription.rows[0].student_limit;
      if (studentLimit && parseInt(studentCount.rows[0].count) >= studentLimit) {
        throw new Error('Student limit reached for current subscription plan');
      }
    }
    
    // Create student
    const result = await client.query(
      `INSERT INTO students (
        school_id, first_name, last_name, email, phone, date_of_birth,
        gender, address, grade, admission_number, enrollment_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        schoolId,
        studentData.first_name,
        studentData.last_name,
        studentData.email,
        studentData.phone,
        studentData.date_of_birth,
        studentData.gender,
        studentData.address,
        studentData.grade,
        studentData.admission_number,
        studentData.enrollment_date,
        'active'
      ]
    );
    
    // Create student user account if email provided
    if (studentData.email) {
      const tempPassword = `student${Math.random().toString(36).slice(-8)}`;
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      
      await client.query(
        `INSERT INTO users (
          school_id, email, password_hash, first_name, last_name, name,
          role, status, is_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          schoolId,
          studentData.email,
          passwordHash,
          studentData.first_name,
          studentData.last_name,
          `${studentData.first_name} ${studentData.last_name}`,
          'student',
          'active',
          false
        ]
      );
    }
    
    return result.rows[0];
  });
};

/**
 * Update student
 */
const updateStudent = async (studentId, schoolId, updateData) => {
  const result = await query(
    `UPDATE students SET
      first_name = COALESCE($1, first_name),
      last_name = COALESCE($2, last_name),
      date_of_birth = COALESCE($3, date_of_birth),
      gender = COALESCE($4, gender),
      grade = COALESCE($5, grade),
      class_name = COALESCE($6, class_name),
      parent_id = COALESCE($7, parent_id),
      emergency_contact = COALESCE($8, emergency_contact),
      medical_info = COALESCE($9, medical_info),
      address = COALESCE($10, address),
      status = COALESCE($11, status),
      updated_at = NOW()
    WHERE id = $12 AND school_id = $13
    RETURNING *`,
    [
      updateData.first_name,
      updateData.last_name,
      updateData.date_of_birth,
      updateData.gender,
      updateData.grade,
      updateData.class_name,
      updateData.parent_id,
      updateData.emergency_contact,
      updateData.medical_info,
      updateData.address,
      updateData.status,
      studentId,
      schoolId
    ]
  );
  
  return result.rows[0];
};

/**
 * Delete student (soft delete)
 */
const deleteStudent = async (studentId, schoolId) => {
  const result = await query(
    `UPDATE students SET status = 'inactive', updated_at = NOW()
     WHERE id = $1 AND school_id = $2
     RETURNING *`,
    [studentId, schoolId]
  );
  
  return result.rows[0];
};

/**
 * Get student performance
 */
const getStudentPerformance = async (studentId, schoolId) => {
  const result = await query(
    `SELECT 
      e.name as exam_name,
      c.name as course_name,
      er.score,
      er.percentage,
      er.grade,
      er.remarks,
      er.created_at
    FROM exam_results er
    JOIN exams e ON er.exam_id = e.id
    JOIN courses c ON e.course_id = c.id
    WHERE er.student_id = $1 AND c.school_id = $2
    ORDER BY er.created_at DESC`,
    [studentId, schoolId]
  );
  
  return result.rows;
};

/**
 * Get student attendance
 */
const getStudentAttendance = async (studentId, schoolId, filters = {}) => {
  let sql = `
    SELECT 
      a.date,
      a.status,
      a.remarks,
      c.name as course_name
    FROM attendance a
    LEFT JOIN courses c ON a.course_id = c.id
    WHERE a.student_id = $1 AND a.school_id = $2
  `;
  
  const params = [studentId, schoolId];
  let paramIndex = 3;
  
  if (filters.startDate) {
    sql += ` AND a.date >= $${paramIndex}`;
    params.push(filters.startDate);
    paramIndex++;
  }
  
  if (filters.endDate) {
    sql += ` AND a.date <= $${paramIndex}`;
    params.push(filters.endDate);
    paramIndex++;
  }
  
  sql += ` ORDER BY a.date DESC`;
  
  const result = await query(sql, params);
  return result.rows;
};

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentPerformance,
  getStudentAttendance
};
