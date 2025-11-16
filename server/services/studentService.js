const bcrypt = require('bcrypt');
const { transaction, query } = require('../db/connection');

// --- NEW HELPER FUNCTION ---
// Generates an admission number based on grade.
// Example: A Grade 10 student in 2025 -> G10-25-XXXX
const generateAdmissionNumber = (grade) => {
  const gradeCode = grade.replace(/[^0-9]/g, ''); // "Grade 10" -> "10"
  const year = new Date().getFullYear().toString().slice(-2); // 2025 -> "25"
  const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  return `G${gradeCode}-${year}-${random}`;
};

// --- MODIFIED createStudent ---
// This function will now ALSO create a 'user' account for the student.
const createStudent = async (client, studentData, school_id, admissionNumber, passwordHash) => {
  const { first_name, last_name, email, phone, date_of_birth, gender, address, grade, enrollment_date } = studentData;

  // 1. Create the User account for the student
  const userResult = await client.query(
    `INSERT INTO users (school_id, email, password_hash, name, role, status, must_change_password)
     VALUES ($1, $2, $3, $4, 'student', 'active', true)
     RETURNING id`,
    [school_id, email, passwordHash, `${first_name} ${last_name}`]
  );
  const studentUserId = userResult.rows[0].id;

  // 2. Create the Student record and link it to the new user_id
  const studentResult = await client.query(
    `INSERT INTO students (school_id, user_id, first_name, last_name, email, phone, date_of_birth, gender, address, admission_number, grade, enrollment_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
     RETURNING *`,
    [school_id, studentUserId, first_name, last_name, email, phone, date_of_birth, gender, address, admissionNumber, grade, enrollment_date]
  );

  return studentResult.rows[0];
};

// --- MODIFIED createParent ---
// This function now accepts the password hash and handles both new AND existing parents.
const createOrLinkParent = async (client, parentData, studentId, school_id, passwordHash) => {
  const { parent_email, parent_name, parent_phone, relationship } = parentData;

  // 1. Check if parent user already exists
  const existingParent = await client.query('SELECT * FROM users WHERE email = $1', [parent_email]);

  let parentUserId;

  if (existingParent.rows.length > 0) {
    // 2a. Parent EXISTS: Use their ID and RESET their password to the student's admission number.
    parentUserId = existingParent.rows[0].id;

    await client.query(
      'UPDATE users SET password_hash = $1, must_change_password = true WHERE id = $2',
      [passwordHash, parentUserId]
    );

  } else {
    // 2b. Parent is NEW: Create a new user account for them with the student's admission number as password.
    const parentUserResult = await client.query(
      `INSERT INTO users (school_id, email, password_hash, name, phone, role, status, must_change_password)
       VALUES ($1, $2, $3, $4, $5, 'parent', 'active', true)
       RETURNING id`,
      [school_id, parent_email, passwordHash, parent_name, parent_phone]
    );
    parentUserId = parentUserResult.rows[0].id;
  }

  // 3. Link student to this parent (this table might not exist, but 'parent_id' on student is better)
  // Your schema has 'parent_id' on the student, so let's use it.
  await client.query(
    'UPDATE students SET parent_id = $1 WHERE id = $2',
    [parentUserId, studentId]
  );

  return parentUserId;
};


// --- MODIFIED Main Service Function ---
const createStudentAndParent = async (studentData, school_id) => {
  return transaction(async (client) => {
    // 1. Generate the single admission number
    const admissionNumber = generateAdmissionNumber(studentData.grade);

    // 2. Hash it ONCE to use as the password for both student and parent
    const passwordHash = await bcrypt.hash(admissionNumber, 10);

    // 3. Create the student (and their user account)
    const student = await createStudent(client, studentData, school_id, admissionNumber, passwordHash);

    // 4. Create or link the parent (and set/reset their password)
    const parentUserId = await createOrLinkParent(client, studentData, student.id, school_id, passwordHash);

    // Return the new student data, now including their admission number
    return student;
  });
};

// Get all students for a school
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

// Add this new function
const getStudentsBySchool = async (school_id) => {
  const result = await query(
    `
    SELECT
      s.*,
      u.email as parent_email,
      u.name as parent_name,
      u.phone as parent_phone
    FROM students s
    LEFT JOIN users u ON s.parent_id = u.id
    WHERE s.school_id = $1
    ORDER BY s.first_name, s.last_name
  `,
    [school_id]
  );
  return result.rows;
};

// Get student by ID
const getStudentById = async (id, schoolId) => {
  const result = await query(
    `
    SELECT
      s.*,
      u.email as parent_email,
      u.name as parent_name,
      u.phone as parent_phone
    FROM students s
    LEFT JOIN users u ON s.parent_id = u.id
    WHERE s.id = $1 AND s.school_id = $2
  `,
    [id, schoolId]
  );
  return result.rows[0];
};

// Update student
const updateStudent = async (id, schoolId, updateData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  Object.keys(updateData).forEach(key => {
    if (updateData[key] !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(updateData[key]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(id, schoolId);

  const result = await query(
    `UPDATE students SET ${fields.join(', ')} WHERE id = $${paramIndex} AND school_id = $${paramIndex + 1} RETURNING *`,
    values
  );

  return result.rows[0];
};

// Delete student (soft delete)
const deleteStudent = async (id, schoolId) => {
  const result = await query(
    'UPDATE students SET status = $1 WHERE id = $2 AND school_id = $3 RETURNING *',
    ['inactive', id, schoolId]
  );
  return result.rows[0];
};

// Get student performance
const getStudentPerformance = async (id, schoolId) => {
  // This would typically involve joining with exams, assignments, etc.
  // For now, return basic structure
  const result = await query(
    `
    SELECT
      s.id,
      s.first_name,
      s.last_name,
      s.grade,
      s.admission_number
    FROM students s
    WHERE s.id = $1 AND s.school_id = $2
  `,
    [id, schoolId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    student: result.rows[0],
    performance: {
      // Placeholder for performance data
      averageGrade: null,
      totalAssignments: 0,
      completedAssignments: 0
    }
  };
};

// Get student attendance
const getStudentAttendance = async (id, schoolId, filters = {}) => {
  let sql = `
    SELECT
      a.*,
      c.name as course_name
    FROM attendance a
    LEFT JOIN courses c ON a.course_id = c.id
    WHERE a.student_id = $1 AND a.school_id = $2
  `;

  const params = [id, schoolId];
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

  sql += ' ORDER BY a.date DESC';

  const result = await query(sql, params);
  return result.rows;
};

module.exports = {
  createStudentAndParent,
  getStudents,
  getStudentsBySchool,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentPerformance,
  getStudentAttendance
};