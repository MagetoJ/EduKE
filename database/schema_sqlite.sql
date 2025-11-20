-- EduKE SQLite Schema for Local Development
-- Minimal schema for timetable functionality

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'student',
    status TEXT DEFAULT 'Active',
    is_verified INTEGER DEFAULT 0,
    email_verified_at TEXT,
    department TEXT,
    class_assigned TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'Kenya',
    postal_code TEXT,
    curriculum TEXT DEFAULT 'cbc',
    level TEXT,
    principal TEXT,
    logo_url TEXT,
    primary_color TEXT,
    accent_color TEXT,
    grade_levels TEXT,
    registration_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    teacher_id INTEGER,
    academic_year_id INTEGER,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    grade TEXT,
    subject_area TEXT,
    schedule TEXT,
    classroom TEXT,
    credits INTEGER,
    max_students INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    UNIQUE(school_id, code)
);

-- Timetable periods
CREATE TABLE IF NOT EXISTS timetable_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    period_number INTEGER,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_break INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- Timetable entries
CREATE TABLE IF NOT EXISTS timetable_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    academic_year_id INTEGER,
    term_id INTEGER,
    course_id INTEGER NOT NULL,
    teacher_id INTEGER,
    day_of_week TEXT NOT NULL,
    period_id INTEGER NOT NULL,
    grade TEXT,
    class_section TEXT,
    classroom TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (period_id) REFERENCES timetable_periods(id)
);

-- Subscription plans (minimal)
CREATE TABLE IF NOT EXISTS subscription_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price_monthly REAL,
    price_annual REAL,
    student_limit INTEGER,
    staff_limit INTEGER,
    trial_duration_days INTEGER DEFAULT 14,
    include_parent_portal INTEGER DEFAULT 0,
    include_student_portal INTEGER DEFAULT 0,
    include_messaging INTEGER DEFAULT 0,
    include_finance INTEGER DEFAULT 0,
    include_advanced_reports INTEGER DEFAULT 0,
    include_leave_management INTEGER DEFAULT 0,
    include_ai_analytics INTEGER DEFAULT 0,
    is_trial INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default subscription plans
INSERT OR IGNORE INTO subscription_plans (name, slug, description, price_monthly, price_annual, student_limit, staff_limit, trial_duration_days, include_parent_portal, include_student_portal, include_messaging, include_finance, include_advanced_reports, include_leave_management, include_ai_analytics, is_trial, is_active) VALUES
('Trial Plan', 'trial', 'Free 14-day trial with limited features', 0.00, 0.00, 50, 10, 14, 0, 0, 0, 0, 0, 0, 0, 1, 1),
('Basic Plan', 'basic', 'Perfect for small schools', 49.99, 499.99, 100, 20, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1),
('Professional Plan', 'pro', 'Advanced features for growing schools', 99.99, 999.99, 500, 50, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1),
('Enterprise Plan', 'enterprise', 'Unlimited features for large institutions', 199.99, 1999.99, NULL, NULL, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    user_id INTEGER,
    parent_id INTEGER,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    date_of_birth DATE,
    gender TEXT,
    address TEXT,
    avatar_url TEXT,
    student_id_number TEXT,
    national_id TEXT,
    grade TEXT NOT NULL,
    class_section TEXT,
    enrollment_date DATE,
    graduation_date DATE,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (parent_id) REFERENCES users(id)
);

-- Parent-student relations table
CREATE TABLE IF NOT EXISTS parent_student_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    relation_type TEXT DEFAULT 'guardian',
    is_primary_contact INTEGER DEFAULT 0,
    is_financial_responsible INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE(parent_id, student_id)
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    teacher_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    total_marks REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- Performance table
CREATE TABLE IF NOT EXISTS performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    assignment_id INTEGER,
    score REAL,
    grade TEXT,
    feedback TEXT,
    submitted_at TEXT,
    graded_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (assignment_id) REFERENCES assignments(id)
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER,
    date DATE NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- Student fees table
CREATE TABLE IF NOT EXISTS student_fees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    fee_structure_id INTEGER,
    school_id INTEGER NOT NULL,
    amount_due REAL NOT NULL,
    amount_paid REAL DEFAULT 0,
    due_date DATE,
    payment_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- Fee structures table
CREATE TABLE IF NOT EXISTS fee_structures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    fee_type TEXT NOT NULL,
    amount REAL NOT NULL,
    frequency TEXT DEFAULT 'annual',
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_schools_slug ON schools(slug);
CREATE INDEX IF NOT EXISTS idx_courses_school ON courses(school_id);
CREATE INDEX IF NOT EXISTS idx_periods_school ON timetable_periods(school_id);
CREATE INDEX IF NOT EXISTS idx_timetable_school ON timetable_entries(school_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day_period ON timetable_entries(day_of_week, period_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_parent_relations ON parent_student_relations(parent_id);
CREATE INDEX IF NOT EXISTS idx_student_relations ON parent_student_relations(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_school ON assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_performance_student ON performance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_student ON student_fees(student_id);