-- Hospital Management System Database Schema
-- PostgreSQL Database for Comprehensive HMS

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'doctor', 'nurse', 'receptionist', 'lab_technician', 'pharmacist', 'radiologist', 'accountant', 'hr_manager', 'housekeeping', 'security')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(32),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Staff Information
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    phone VARCHAR(15),
    emergency_contact VARCHAR(15),
    address TEXT,
    department VARCHAR(50),
    designation VARCHAR(50),
    specialization VARCHAR(100),
    license_number VARCHAR(50),
    hire_date DATE,
    salary DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patients
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    blood_group VARCHAR(5),
    phone VARCHAR(15),
    email VARCHAR(100),
    emergency_contact VARCHAR(15),
    emergency_contact_name VARCHAR(100),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    pincode VARCHAR(10),
    nationality VARCHAR(50) DEFAULT 'Indian',
    marital_status VARCHAR(20),
    occupation VARCHAR(100),
    insurance_provider VARCHAR(100),
    insurance_policy_number VARCHAR(50),
    allergies TEXT,
    medical_history TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    description TEXT,
    head_of_department UUID REFERENCES staff(id),
    location VARCHAR(100),
    phone VARCHAR(15),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Beds and Wards
CREATE TABLE wards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    ward_type VARCHAR(50) CHECK (ward_type IN ('general', 'private', 'semi_private', 'icu', 'nicu', 'emergency', 'maternity')),
    floor_number INTEGER,
    total_beds INTEGER,
    available_beds INTEGER,
    department_id UUID REFERENCES departments(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE beds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bed_number VARCHAR(10) NOT NULL,
    ward_id UUID REFERENCES wards(id),
    bed_type VARCHAR(50) CHECK (bed_type IN ('general', 'icu', 'ventilator', 'isolation')),
    status VARCHAR(20) CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')) DEFAULT 'available',
    daily_rate DECIMAL(8,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OPD Appointments
CREATE TABLE opd_appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_number VARCHAR(20) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES staff(id),
    department_id UUID REFERENCES departments(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    appointment_type VARCHAR(50) CHECK (appointment_type IN ('consultation', 'follow_up', 'emergency', 'routine_checkup')),
    status VARCHAR(20) CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')) DEFAULT 'scheduled',
    chief_complaint TEXT,
    consultation_fee DECIMAL(8,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IPD Admissions
CREATE TABLE ipd_admissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admission_number VARCHAR(20) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES staff(id),
    bed_id UUID REFERENCES beds(id),
    admission_date TIMESTAMP NOT NULL,
    discharge_date TIMESTAMP,
    admission_type VARCHAR(50) CHECK (admission_type IN ('emergency', 'planned', 'transfer')),
    diagnosis TEXT,
    treatment_plan TEXT,
    status VARCHAR(20) CHECK (status IN ('admitted', 'discharged', 'transferred', 'deceased')) DEFAULT 'admitted',
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Operation Theatre
CREATE TABLE operation_theatres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ot_number VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100),
    ot_type VARCHAR(50) CHECK (ot_type IN ('major', 'minor', 'cardiac', 'neuro', 'orthopedic')),
    status VARCHAR(20) CHECK (status IN ('available', 'occupied', 'maintenance', 'cleaning')) DEFAULT 'available',
    equipment_list TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ot_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ot_id UUID REFERENCES operation_theatres(id),
    patient_id UUID REFERENCES patients(id),
    surgeon_id UUID REFERENCES staff(id),
    anesthetist_id UUID REFERENCES staff(id),
    procedure_name VARCHAR(200) NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_start_time TIME NOT NULL,
    scheduled_end_time TIME NOT NULL,
    actual_start_time TIME,
    actual_end_time TIME,
    status VARCHAR(20) CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed')) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Emergency Department
CREATE TABLE emergency_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number VARCHAR(20) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id),
    triage_level VARCHAR(20) CHECK (triage_level IN ('critical', 'urgent', 'less_urgent', 'non_urgent')) NOT NULL,
    arrival_time TIMESTAMP NOT NULL,
    chief_complaint TEXT,
    vital_signs JSONB,
    assigned_doctor_id UUID REFERENCES staff(id),
    status VARCHAR(20) CHECK (status IN ('waiting', 'in_treatment', 'admitted', 'discharged', 'referred')) DEFAULT 'waiting',
    discharge_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pharmacy
CREATE TABLE drug_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drugs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drug_code VARCHAR(20) UNIQUE NOT NULL,
    generic_name VARCHAR(200) NOT NULL,
    brand_name VARCHAR(200),
    category_id UUID REFERENCES drug_categories(id),
    manufacturer VARCHAR(100),
    dosage_form VARCHAR(50) CHECK (dosage_form IN ('tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops')),
    strength VARCHAR(50),
    unit_price DECIMAL(8,2),
    reorder_level INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drug_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drug_id UUID REFERENCES drugs(id),
    batch_number VARCHAR(50) NOT NULL,
    expiry_date DATE NOT NULL,
    quantity_received INTEGER NOT NULL,
    quantity_available INTEGER NOT NULL,
    purchase_price DECIMAL(8,2),
    supplier VARCHAR(100),
    received_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Laboratory
CREATE TABLE lab_test_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_code VARCHAR(20) UNIQUE NOT NULL,
    test_name VARCHAR(200) NOT NULL,
    category_id UUID REFERENCES lab_test_categories(id),
    sample_type VARCHAR(50) CHECK (sample_type IN ('blood', 'urine', 'stool', 'sputum', 'csf', 'other')),
    normal_range VARCHAR(100),
    unit VARCHAR(20),
    price DECIMAL(8,2),
    turnaround_time INTEGER, -- in hours
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lab_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES staff(id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    priority VARCHAR(20) CHECK (priority IN ('routine', 'urgent', 'stat')) DEFAULT 'routine',
    status VARCHAR(20) CHECK (status IN ('ordered', 'sample_collected', 'in_progress', 'completed', 'cancelled')) DEFAULT 'ordered',
    total_amount DECIMAL(8,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Radiology
CREATE TABLE radiology_equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_code VARCHAR(20) UNIQUE NOT NULL,
    equipment_name VARCHAR(100) NOT NULL,
    equipment_type VARCHAR(50) CHECK (equipment_type IN ('xray', 'ct', 'mri', 'ultrasound', 'mammography')),
    location VARCHAR(100),
    status VARCHAR(20) CHECK (status IN ('available', 'in_use', 'maintenance', 'out_of_order')) DEFAULT 'available',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE radiology_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES staff(id),
    equipment_id UUID REFERENCES radiology_equipment(id),
    study_type VARCHAR(100) NOT NULL,
    body_part VARCHAR(100),
    clinical_indication TEXT,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scheduled_date TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('ordered', 'scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'ordered',
    priority VARCHAR(20) CHECK (priority IN ('routine', 'urgent', 'stat')) DEFAULT 'routine',
    price DECIMAL(8,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blood Bank
CREATE TABLE blood_donors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    blood_group VARCHAR(5) NOT NULL,
    phone VARCHAR(15),
    email VARCHAR(100),
    address TEXT,
    last_donation_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blood_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bag_number VARCHAR(20) UNIQUE NOT NULL,
    donor_id UUID REFERENCES blood_donors(id),
    blood_group VARCHAR(5) NOT NULL,
    component_type VARCHAR(50) CHECK (component_type IN ('whole_blood', 'packed_rbc', 'plasma', 'platelets', 'cryoprecipitate')),
    collection_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    volume_ml INTEGER,
    status VARCHAR(20) CHECK (status IN ('available', 'reserved', 'issued', 'expired', 'discarded')) DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Billing
CREATE TABLE billing_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE billing_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_code VARCHAR(20) UNIQUE NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    category_id UUID REFERENCES billing_categories(id),
    unit_price DECIMAL(8,2) NOT NULL,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patient_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number VARCHAR(20) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id),
    admission_id UUID REFERENCES ipd_admissions(id),
    bill_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    balance_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('draft', 'pending', 'paid', 'partially_paid', 'overdue', 'cancelled')) DEFAULT 'pending',
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insurance
CREATE TABLE insurance_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(100) NOT NULL,
    provider_code VARCHAR(20) UNIQUE NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(15),
    email VARCHAR(100),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE insurance_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_number VARCHAR(20) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id),
    provider_id UUID REFERENCES insurance_providers(id),
    policy_number VARCHAR(50) NOT NULL,
    admission_id UUID REFERENCES ipd_admissions(id),
    claim_amount DECIMAL(10,2) NOT NULL,
    approved_amount DECIMAL(10,2),
    claim_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'settled')) DEFAULT 'submitted',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ambulance
CREATE TABLE ambulances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_number VARCHAR(20) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50) CHECK (vehicle_type IN ('basic', 'advanced', 'critical_care')),
    driver_name VARCHAR(100),
    driver_phone VARCHAR(15),
    status VARCHAR(20) CHECK (status IN ('available', 'on_duty', 'maintenance', 'out_of_service')) DEFAULT 'available',
    equipment_list TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ambulance_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(20) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id),
    ambulance_id UUID REFERENCES ambulances(id),
    pickup_location TEXT NOT NULL,
    destination TEXT NOT NULL,
    request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pickup_time TIMESTAMP,
    drop_time TIMESTAMP,
    distance_km DECIMAL(6,2),
    fare_amount DECIMAL(8,2),
    status VARCHAR(20) CHECK (status IN ('requested', 'assigned', 'en_route', 'completed', 'cancelled')) DEFAULT 'requested',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_patients_patient_id ON patients(patient_id);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_opd_appointments_date ON opd_appointments(appointment_date);
CREATE INDEX idx_opd_appointments_doctor ON opd_appointments(doctor_id);
CREATE INDEX idx_ipd_admissions_patient ON ipd_admissions(patient_id);
CREATE INDEX idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX idx_radiology_orders_patient ON radiology_orders(patient_id);
CREATE INDEX idx_patient_bills_patient ON patient_bills(patient_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_staff_employee_id ON staff(employee_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opd_appointments_updated_at BEFORE UPDATE ON opd_appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ipd_admissions_updated_at BEFORE UPDATE ON ipd_admissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();