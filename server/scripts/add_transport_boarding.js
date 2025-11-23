const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_URL.includes('render.com') 
    ? { rejectUnauthorized: false } 
    : false
});

async function addTransportAndBoarding() {
  const client = await pool.connect();
  try {
    console.log('Adding Transport and Boarding tables...\n');

    console.log('Creating transport_routes table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS transport_routes (
        id SERIAL PRIMARY KEY,
        school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        
        route_name VARCHAR(255) NOT NULL,
        route_code VARCHAR(50),
        description TEXT,
        
        start_location VARCHAR(255),
        end_location VARCHAR(255),
        
        pickup_time TIME,
        dropoff_time TIME,
        
        vehicle_type VARCHAR(50),
        capacity INT,
        
        driver_id INT REFERENCES users(id) ON DELETE SET NULL,
        
        fare_amount DECIMAL(10,2),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(school_id, route_code)
      );
      CREATE INDEX idx_transport_route_school ON transport_routes(school_id);
    `);
    console.log('✓ transport_routes created');

    console.log('Creating transport_enrollments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS transport_enrollments (
        id SERIAL PRIMARY KEY,
        school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        route_id INT NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
        
        enrollment_date DATE DEFAULT CURRENT_DATE,
        payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid', 'partial', 'pending')),
        
        amount_due DECIMAL(10,2),
        amount_paid DECIMAL(10,2) DEFAULT 0,
        
        start_date DATE,
        end_date DATE,
        
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'completed')),
        
        notes TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(student_id, route_id)
      );
      CREATE INDEX idx_transport_enrollment_student ON transport_enrollments(student_id);
      CREATE INDEX idx_transport_enrollment_route ON transport_enrollments(route_id);
      CREATE INDEX idx_transport_enrollment_status ON transport_enrollments(status);
    `);
    console.log('✓ transport_enrollments created');

    console.log('Creating boarding_houses table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS boarding_houses (
        id SERIAL PRIMARY KEY,
        school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        
        house_name VARCHAR(255) NOT NULL,
        house_code VARCHAR(50),
        
        house_master_id INT REFERENCES users(id) ON DELETE SET NULL,
        deputy_master_id INT REFERENCES users(id) ON DELETE SET NULL,
        
        capacity INT,
        current_occupancy INT DEFAULT 0,
        
        gender_type VARCHAR(20) CHECK (gender_type IN ('boys', 'girls', 'mixed')),
        
        floor_count INT,
        facilities TEXT,
        
        fee_amount DECIMAL(10,2),
        
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'full', 'maintenance')),
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(school_id, house_code)
      );
      CREATE INDEX idx_boarding_house_school ON boarding_houses(school_id);
      CREATE INDEX idx_boarding_house_master ON boarding_houses(house_master_id);
    `);
    console.log('✓ boarding_houses created');

    console.log('Creating boarding_rooms table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS boarding_rooms (
        id SERIAL PRIMARY KEY,
        boarding_house_id INT NOT NULL REFERENCES boarding_houses(id) ON DELETE CASCADE,
        
        room_number VARCHAR(50) NOT NULL,
        floor INT,
        
        room_type VARCHAR(20) CHECK (room_type IN ('single', 'double', 'triple', 'dormitory')),
        bed_capacity INT,
        available_beds INT,
        
        status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(boarding_house_id, room_number)
      );
      CREATE INDEX idx_boarding_room_house ON boarding_rooms(boarding_house_id);
      CREATE INDEX idx_boarding_room_status ON boarding_rooms(status);
    `);
    console.log('✓ boarding_rooms created');

    console.log('Creating boarding_enrollments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS boarding_enrollments (
        id SERIAL PRIMARY KEY,
        school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        boarding_house_id INT NOT NULL REFERENCES boarding_houses(id) ON DELETE CASCADE,
        room_id INT REFERENCES boarding_rooms(id) ON DELETE SET NULL,
        
        enrollment_date DATE DEFAULT CURRENT_DATE,
        check_in_date DATE,
        check_out_date DATE,
        
        academic_year_id INT REFERENCES academic_years(id) ON DELETE SET NULL,
        
        payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid', 'partial', 'pending')),
        amount_due DECIMAL(10,2),
        amount_paid DECIMAL(10,2) DEFAULT 0,
        
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'completed')),
        
        emergency_contact_phone VARCHAR(50),
        parent_signature TEXT,
        
        notes TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(student_id, academic_year_id)
      );
      CREATE INDEX idx_boarding_enrollment_student ON boarding_enrollments(student_id);
      CREATE INDEX idx_boarding_enrollment_house ON boarding_enrollments(boarding_house_id);
      CREATE INDEX idx_boarding_enrollment_status ON boarding_enrollments(status);
    `);
    console.log('✓ boarding_enrollments created');

    console.log('Creating boarding_violations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS boarding_violations (
        id SERIAL PRIMARY KEY,
        school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        boarding_house_id INT NOT NULL REFERENCES boarding_houses(id) ON DELETE CASCADE,
        
        reported_by INT REFERENCES users(id) ON DELETE SET NULL,
        
        violation_type VARCHAR(100) NOT NULL,
        severity VARCHAR(20) DEFAULT 'minor' CHECK (severity IN ('minor', 'moderate', 'major', 'critical')),
        
        date_reported DATE DEFAULT CURRENT_DATE,
        description TEXT,
        
        action_taken TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'escalated', 'closed')),
        
        parent_notified BOOLEAN DEFAULT FALSE,
        parent_notified_at TIMESTAMP,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_boarding_violation_student ON boarding_violations(student_id);
      CREATE INDEX idx_boarding_violation_house ON boarding_violations(boarding_house_id);
    `);
    console.log('✓ boarding_violations created');

    console.log('\n✓ All Transport and Boarding tables created successfully!');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✓ Tables already exist');
    } else {
      console.error('Error creating tables:', error);
      process.exit(1);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

addTransportAndBoarding();
