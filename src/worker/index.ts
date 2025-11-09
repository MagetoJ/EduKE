import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

// API Routes
app.post('/api/schools', async (c) => {
  try {
    const { name, address, phone, email, principal, logo } = await c.req.json();

    // Insert into database
    const result = await c.env.DB.prepare(
      'INSERT INTO schools (name, address, phone, email, principal, logo) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(name, address, phone, email, principal, logo).run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/students', async (c) => {
  try {
    const { first_name, last_name, email, phone, date_of_birth, address, grade, enrollment_date, school_id, parent_id } = await c.req.json();

    // Insert into database
    const result = await c.env.DB.prepare(
      'INSERT INTO students (first_name, last_name, email, phone, date_of_birth, address, grade, enrollment_date, school_id, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(first_name, last_name, email, phone, date_of_birth, address, grade, enrollment_date, school_id, parent_id || null).run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/users', async (c) => {
  try {
    const { name, email, password, role, phone, school_id } = await c.req.json();

    // Insert into users table
    const result = await c.env.DB.prepare(
      'INSERT INTO users (name, email, password, role, phone, school_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(name, email, password, role, phone, school_id).run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Discipline endpoints
app.post('/api/discipline', async (c) => {
  try {
    const { student_id, teacher_id, type, severity, description, date } = await c.req.json();

    const result = await c.env.DB.prepare(
      'INSERT INTO discipline (student_id, teacher_id, type, severity, description, date, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(student_id, teacher_id, type, severity, description, date, 'Pending').run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/discipline/:studentId', async (c) => {
  try {
    const studentId = c.req.param('studentId');
    const result = await c.env.DB.prepare(
      'SELECT * FROM discipline WHERE student_id = ? ORDER BY date DESC'
    ).bind(studentId).all();

    return c.json(result.results);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Performance endpoints
app.post('/api/performance', async (c) => {
  try {
    const { student_id, teacher_id, subject, grade, term, comments } = await c.req.json();

    const result = await c.env.DB.prepare(
      'INSERT INTO performance (student_id, teacher_id, subject, grade, term, comments, date_recorded) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(student_id, teacher_id, subject, grade, term, comments, new Date().toISOString()).run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/performance/:studentId', async (c) => {
  try {
    const studentId = c.req.param('studentId');
    const result = await c.env.DB.prepare(
      'SELECT * FROM performance WHERE student_id = ? ORDER BY date_recorded DESC'
    ).bind(studentId).all();

    return c.json(result.results);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Attendance endpoints
app.post('/api/attendance', async (c) => {
  try {
    const { student_id, date, status, teacher_id } = await c.req.json();

    const result = await c.env.DB.prepare(
      'INSERT OR REPLACE INTO attendance (student_id, date, status, teacher_id) VALUES (?, ?, ?, ?)'
    ).bind(student_id, date, status, teacher_id).run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/attendance/:studentId', async (c) => {
  try {
    const studentId = c.req.param('studentId');
    const result = await c.env.DB.prepare(
      'SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC'
    ).bind(studentId).all();

    return c.json(result.results);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Parent access endpoint - verify student credentials and return data
app.post('/api/parent/access', async (c) => {
  try {
    const { student_id, student_password } = await c.req.json();

    // First get the student record
    const student = await c.env.DB.prepare(
      'SELECT * FROM students WHERE id = ?'
    ).bind(student_id).first();

    if (!student) {
      return c.json({ error: 'Student not found' }, 404);
    }

    // Find the student user account by email (since email should be unique)
    const studentUser = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ? AND role = ?'
    ).bind(student.email, 'student').first();

    if (!studentUser || studentUser.password !== student_password) {
      return c.json({ error: 'Invalid student ID or password' }, 401);
    }

    // Get student data, discipline, performance, attendance, financial
    const discipline = await c.env.DB.prepare(
      'SELECT * FROM discipline WHERE student_id = ? ORDER BY date DESC'
    ).bind(student_id).all();

    const performance = await c.env.DB.prepare(
      'SELECT * FROM performance WHERE student_id = ? ORDER BY date_recorded DESC'
    ).bind(student_id).all();

    const attendance = await c.env.DB.prepare(
      'SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 50'
    ).bind(student_id).all();

    // Mock financial data for now
    const financial = {
      feesPaid: 1200,
      feesDue: 300,
      totalFees: 1500,
      status: 'Partial'
    };

    return c.json({
      student: {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        grade: student.grade,
        class: 'A' // Would come from database
      },
      discipline: discipline.results,
      performance: performance.results,
      attendance: attendance.results,
      financial
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/reports/financial-summary', async (c) => {
  try {
    // Mock data for now - in real app, calculate from fees table
    const data = [
      {
        name: "January",
        Collected: 45200,
        Pending: 5800,
      },
      {
        name: "February",
        Collected: 48750,
        Pending: 6250,
      },
      {
        name: "March",
        Collected: 52300,
        Pending: 4700,
      },
      {
        name: "April",
        Collected: 49800,
        Pending: 7200,
      },
      {
        name: "May",
        Collected: 54600,
        Pending: 5400,
      },
      {
        name: "June",
        Collected: 51200,
        Pending: 6800,
      },
    ];
    return c.json(data);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/reports/performance-summary', async (c) => {
  try {
    // Mock data for now - in real app, calculate from performance table
    const data = [
      {
        subject: "Mathematics",
        average: 85,
        students: 45,
      },
      {
        subject: "English",
        average: 78,
        students: 42,
      },
      {
        subject: "Science",
        average: 82,
        students: 48,
      },
      {
        subject: "History",
        average: 75,
        students: 38,
      },
      {
        subject: "Geography",
        average: 80,
        students: 41,
      },
      {
        subject: "Art",
        average: 88,
        students: 35,
      },
    ];
    return c.json(data);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/reports/school-analytics', async (c) => {
  try {
    // Mock data for super admin - analytics of schools using the system
    const data = [
      {
        month: "January",
        newSchools: 12,
        totalSchools: 145,
        activeSchools: 138,
      },
      {
        month: "February",
        newSchools: 8,
        totalSchools: 153,
        activeSchools: 148,
      },
      {
        month: "March",
        newSchools: 15,
        totalSchools: 168,
        activeSchools: 162,
      },
      {
        month: "April",
        newSchools: 10,
        totalSchools: 178,
        activeSchools: 172,
      },
      {
        month: "May",
        newSchools: 18,
        totalSchools: 196,
        activeSchools: 189,
      },
      {
        month: "June",
        newSchools: 22,
        totalSchools: 218,
        activeSchools: 210,
      },
    ];
    return c.json(data);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/reports/subscription-status', async (c) => {
  try {
    // Mock data for super admin - subscription/payment status
    const data = [
      {
        plan: "Basic",
        subscribers: 85,
        revenue: 4250,
        status: "Active",
      },
      {
        plan: "Pro",
        subscribers: 45,
        revenue: 9000,
        status: "Active",
      },
      {
        plan: "Enterprise",
        subscribers: 12,
        revenue: 12000,
        status: "Active",
      },
      {
        plan: "Trial",
        subscribers: 28,
        revenue: 0,
        status: "Trial",
      },
      {
        plan: "Expired",
        subscribers: 15,
        revenue: 0,
        status: "Expired",
      },
    ];
    return c.json(data);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

export default app;
