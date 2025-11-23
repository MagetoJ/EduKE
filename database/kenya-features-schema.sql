-- CBC Strands
CREATE TABLE IF NOT EXISTS cbc_strands (
    id SERIAL PRIMARY KEY,
    school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    grade_level VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, code)
);

CREATE INDEX IF NOT EXISTS idx_cbc_strand_school ON cbc_strands(school_id);

-- CBC Assessments
CREATE TABLE IF NOT EXISTS cbc_assessments (
    id SERIAL PRIMARY KEY,
    school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    strand_id INT NOT NULL REFERENCES cbc_strands(id) ON DELETE CASCADE,
    assessment_type VARCHAR(20) CHECK (assessment_type IN ('formative', 'summative')),
    marks DECIMAL(5,2),
    grade INT CHECK (grade IN (1, 2, 3, 4)),
    comments TEXT,
    assessment_date DATE DEFAULT CURRENT_DATE,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cbc_assessment_school ON cbc_assessments(school_id);

-- NEMIS Registration
CREATE TABLE IF NOT EXISTS nemis_student_registration (
    id SERIAL PRIMARY KEY,
    school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    upi VARCHAR(50),
    birth_certificate_no VARCHAR(50),
    registration_status VARCHAR(20) DEFAULT 'registered',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_nemis_school ON nemis_student_registration(school_id);

-- KNEC Registration
CREATE TABLE IF NOT EXISTS knec_candidate_registration (
    id SERIAL PRIMARY KEY,
    school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exam_type VARCHAR(50) CHECK (exam_type IN ('KCSE', 'KCPE', 'KPSEA')),
    subjects JSONB,
    registration_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_knec_school ON knec_candidate_registration(school_id);

-- M-PESA Transactions
CREATE TABLE IF NOT EXISTS mpesa_transactions (
    id SERIAL PRIMARY KEY,
    school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    mpesa_code VARCHAR(50) UNIQUE,
    phone_number VARCHAR(20),
    transaction_type VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mpesa_school ON mpesa_transactions(school_id);

-- Boarding Assignments
CREATE TABLE IF NOT EXISTS boarding_assignments (
    id SERIAL PRIMARY KEY,
    school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    dormitory_id INT,
    bed_number VARCHAR(10),
    assignment_status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_boarding_school ON boarding_assignments(school_id);

-- Boarding Exeat Requests
CREATE TABLE IF NOT EXISTS boarding_exeat_requests (
    id SERIAL PRIMARY KEY,
    school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    approval_notes TEXT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exeat_school ON boarding_exeat_requests(school_id);

-- Kitchen Inventory
CREATE TABLE IF NOT EXISTS kitchen_inventory_logs (
    id SERIAL PRIMARY KEY,
    school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20),
    usage_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kitchen_school ON kitchen_inventory_logs(school_id);

-- Textbook Issuance
CREATE TABLE IF NOT EXISTS textbook_issuance_logs (
    id SERIAL PRIMARY KEY,
    school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    book_id VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    issue_date DATE DEFAULT CURRENT_DATE,
    return_date DATE,
    status VARCHAR(20) DEFAULT 'issued',
    loss_fee DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_textbook_school ON textbook_issuance_logs(school_id);

-- SMS Campaigns
CREATE TABLE IF NOT EXISTS sms_campaigns (
    id SERIAL PRIMARY KEY,
    school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    recipient_group VARCHAR(50),
    message TEXT NOT NULL,
    gateway VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMP,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaign_school ON sms_campaigns(school_id);

-- Transport Routes
CREATE TABLE IF NOT EXISTS transport_routes (
    id SERIAL PRIMARY KEY,
    school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    route_name VARCHAR(100) NOT NULL,
    starting_point VARCHAR(255),
    ending_point VARCHAR(255),
    distance_km DECIMAL(5,2),
    price_per_term DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, route_name)
);

CREATE INDEX IF NOT EXISTS idx_route_school ON transport_routes(school_id);

-- Transport Assignments
CREATE TABLE IF NOT EXISTS transport_assignments (
    id SERIAL PRIMARY KEY,
    school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    route_id INT NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
    pickup_point VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_transport_school ON transport_assignments(school_id);

-- Transport Attendance
CREATE TABLE IF NOT EXISTS transport_attendance (
    id SERIAL PRIMARY KEY,
    school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    route_id INT REFERENCES transport_routes(id) ON DELETE SET NULL,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'present',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, student_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_transport_attendance_school ON transport_attendance(school_id);
