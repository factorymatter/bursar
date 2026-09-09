-- Bursar Database Schema
-- Version: 1.0
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Institutions table
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) DEFAULT 'community_college',
    timezone VARCHAR(50) DEFAULT 'UTC',
    academic_calendar JSONB,
    settings JSONB,
    sis_type VARCHAR(100),
    sis_config JSONB,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_institutions_code ON institutions(code);
CREATE INDEX idx_institutions_status ON institutions(status);

-- Students table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    sis_student_id VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    date_of_birth DATE,
    enrollment_status VARCHAR(50) DEFAULT 'active',
    program_id UUID,
    expected_completion DATE,
    sap_status VARCHAR(50) DEFAULT 'good',
    sap_effective_date DATE,
    metadata JSONB,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, sis_student_id)
);

CREATE INDEX idx_students_institution ON students(institution_id);
CREATE INDEX idx_students_sis_id ON students(sis_student_id);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_sap_status ON students(sap_status);

-- Academic terms table
CREATE TABLE academic_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    term_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    census_date DATE,
    drop_deadline DATE,
    withdrawal_deadline DATE,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_terms_institution ON academic_terms(institution_id);
CREATE INDEX idx_terms_current ON academic_terms(is_current);

-- Courses table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    sis_course_id VARCHAR(100) NOT NULL,
    course_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    credits DECIMAL(4,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, sis_course_id)
);

CREATE INDEX idx_courses_institution ON courses(institution_id);
CREATE INDEX idx_courses_active ON courses(is_active);

-- Sections table
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    sis_section_id VARCHAR(100) NOT NULL,
    section_number VARCHAR(20),
    term_id UUID REFERENCES academic_terms(id),
    instructor_id UUID,
    schedule JSONB,
    capacity INTEGER,
    enrolled_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, sis_section_id)
);

CREATE INDEX idx_sections_institution ON sections(institution_id);
CREATE INDEX idx_sections_term ON sections(term_id);
CREATE INDEX idx_sections_course ON sections(course_id);

-- Enrollments table
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    term_id UUID REFERENCES academic_terms(id),
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'enrolled',
    grade VARCHAR(2),
    credits_attempted DECIMAL(4,2) NOT NULL,
    credits_earned DECIMAL(4,2),
    is_repeat BOOLEAN DEFAULT FALSE,
    financial_impact DECIMAL(10,2),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, section_id)
);

CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_section ON enrollments(section_id);
CREATE INDEX idx_enrollments_term ON enrollments(term_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- Financial aid packages table
CREATE TABLE financial_aid_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    academic_year VARCHAR(20) NOT NULL,
    term_type VARCHAR(50),
    pell_grant_amount DECIMAL(10,2) DEFAULT 0,
    pell_credits_required INTEGER DEFAULT 12,
    seog_amount DECIMAL(10,2) DEFAULT 0,
    state_grant_amount DECIMAL(10,2) DEFAULT 0,
    institutional_scholarship DECIMAL(10,2) DEFAULT 0,
    federal_loan_amount DECIMAL(10,2) DEFAULT 0,
    total_aid DECIMAL(10,2) DEFAULT 0,
    disbursement_status VARCHAR(50) DEFAULT 'pending',
    sap_eligibility VARCHAR(50) DEFAULT 'eligible',
    r2t4_calculation_required BOOLEAN DEFAULT FALSE,
    effective_date DATE,
    expiration_date DATE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, academic_year, term_type)
);

CREATE INDEX idx_fa_packages_student ON financial_aid_packages(student_id);
CREATE INDEX idx_fa_packages_academic_year ON financial_aid_packages(academic_year);
CREATE INDEX idx_fa_packages_sap ON financial_aid_packages(sap_eligibility);

-- Aid types lookup table
CREATE TABLE aid_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    credit_threshold INTEGER DEFAULT 12,
    max_amount DECIMAL(10,2),
    rules JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, code)
);

-- Advisors table (moved before rules to satisfy FK dependency)
CREATE TABLE advisors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    sis_advisor_id VARCHAR(100),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    title VARCHAR(200),
    department VARCHAR(100),
    caseload_capacity INTEGER DEFAULT 50,
    current_caseload INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    specialties JSONB,
    availability JSONB,
    timezone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, email)
);

CREATE INDEX idx_advisors_institution ON advisors(institution_id);
CREATE INDEX idx_advisors_department ON advisors(department);
CREATE INDEX idx_advisors_active ON advisors(is_active);

-- Rules table
CREATE TABLE rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 100,
    institution_specific BOOLEAN DEFAULT FALSE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, code)
);

CREATE INDEX idx_rules_institution ON rules(institution_id);
CREATE INDEX idx_rules_category ON rules(category);
CREATE INDEX idx_rules_active ON rules(is_active);
CREATE INDEX idx_rules_priority ON rules(priority);

-- Rule evaluations table
CREATE TABLE rule_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES rules(id),
    student_id UUID NOT NULL REFERENCES students(id),
    enrollment_change_id UUID,
    context_data JSONB NOT NULL,
    result VARCHAR(50) NOT NULL,
    triggered_conditions JSONB,
    calculated_impact DECIMAL(10,2),
    evaluation_time_ms INTEGER,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rule_evaluations_rule ON rule_evaluations(rule_id);
CREATE INDEX idx_rule_evaluations_student ON rule_evaluations(student_id);
CREATE INDEX idx_rule_evaluations_at ON rule_evaluations(evaluated_at);

-- Warnings table
CREATE TABLE warnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    rule_evaluation_id UUID REFERENCES rule_evaluations(id),
    enrollment_change_id UUID,
    severity VARCHAR(50) NOT NULL,
    title VARCHAR(300) NOT NULL,
    message TEXT NOT NULL,
    financial_impact DECIMAL(10,2),
    aid_types_affected JSONB,
    context_data JSONB,
    status VARCHAR(50) DEFAULT 'active',
    advisor_id UUID REFERENCES advisors(id),
    appointment_id UUID,
    shown_to_student_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_warnings_student ON warnings(student_id);
CREATE INDEX idx_warnings_institution ON warnings(institution_id);
CREATE INDEX idx_warnings_status ON warnings(status);
CREATE INDEX idx_warnings_severity ON warnings(severity);
CREATE INDEX idx_warnings_created ON warnings(created_at);

-- Advisor assignments table
CREATE TABLE advisor_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES advisors(id),
    reason VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(student_id, advisor_id, institution_id)
);

CREATE INDEX idx_assignments_student ON advisor_assignments(student_id);
CREATE INDEX idx_assignments_advisor ON advisor_assignments(advisor_id);

-- Appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id),
    advisor_id UUID NOT NULL REFERENCES advisors(id),
    warning_id UUID REFERENCES warnings(id),
    appointment_type VARCHAR(100) NOT NULL,
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'scheduled',
    location_type VARCHAR(50) DEFAULT 'virtual',
    location_details JSONB,
    notes TEXT,
    created_via VARCHAR(50) DEFAULT 'advisor_routing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_appointments_student ON appointments(student_id);
CREATE INDEX idx_appointments_advisor ON appointments(advisor_id);
CREATE INDEX idx_appointments_warning ON appointments(warning_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_start);

-- SIS integrations table
CREATE TABLE sis_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(100) NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    api_version VARCHAR(50),
    credentials JSONB NOT NULL,
    webhook_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(50),
    sync_error TEXT,
    config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, type)
);

CREATE INDEX idx_sis_integrations_institution ON sis_integrations(institution_id);
CREATE INDEX idx_sis_integrations_active ON sis_integrations(is_active);

-- Enrollment change requests table
CREATE TABLE enrollment_change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    section_id UUID NOT NULL REFERENCES sections(id),
    change_type VARCHAR(50) NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    requested_ip INET,
    user_agent TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    outcome_status VARCHAR(50),
    risk_assessment JSONB,
    evaluated_at TIMESTAMP WITH TIME ZONE,
    evaluation_results JSONB,
    metadata JSONB
);

CREATE INDEX idx_change_requests_student ON enrollment_change_requests(student_id);
CREATE INDEX idx_change_requests_status ON enrollment_change_requests(status);
CREATE INDEX idx_change_requests_at ON enrollment_change_requests(requested_at);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    actor_type VARCHAR(50) NOT NULL,
    actor_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    previous_state JSONB,
    new_state JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_institution ON audit_logs(institution_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_type, actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warning_id UUID NOT NULL REFERENCES warnings(id),
    student_id UUID NOT NULL REFERENCES students(id),
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    provider_response JSONB,
    metadata JSONB
);

CREATE INDEX idx_notifications_warning ON notifications(warning_id);
CREATE INDEX idx_notifications_student ON notifications(student_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- Advisor availability table
CREATE TABLE advisor_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    recurrence VARCHAR(50) DEFAULT 'weekly',
    effective_date DATE,
    expiration_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_advisor_availability_advisor ON advisor_availability(advisor_id);

-- SAP appeals table
CREATE TABLE sap_appeals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    warning_id UUID REFERENCES warnings(id),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'submitted',
    reason TEXT NOT NULL,
    supporting_documents JSONB,
    reviewed_by UUID REFERENCES advisors(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    decision TEXT,
    appeal_outcome VARCHAR(50),
    new_sap_status VARCHAR(50),
    conditions JSONB,
    metadata JSONB
);

CREATE INDEX idx_sap_appeals_student ON sap_appeals(student_id);
CREATE INDEX idx_sap_appeals_status ON sap_appeals(status);

-- Analytics daily summary table
CREATE TABLE analytics_daily_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    summary_date DATE NOT NULL,
    active_students INTEGER DEFAULT 0,
    total_enrollments INTEGER DEFAULT 0,
    aid_packages_count INTEGER DEFAULT 0,
    warnings_generated INTEGER DEFAULT 0,
    warnings_viewed_by_students INTEGER DEFAULT 0,
    warnings_acknowledged INTEGER DEFAULT 0,
    advisor_assignments_made INTEGER DEFAULT 0,
    appointments_scheduled INTEGER DEFAULT 0,
    appointments_completed INTEGER DEFAULT 0,
    aid_loss_prevented_estimate DECIMAL(12,2) DEFAULT 0,
    retention_impact_estimate INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, summary_date)
);

CREATE INDEX idx_analytics_daily_institution ON analytics_daily_summary(institution_id);
CREATE INDEX idx_analytics_daily_date ON analytics_daily_summary(summary_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_institutions_updated_at BEFORE UPDATE ON institutions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_aid_packages_updated_at BEFORE UPDATE ON financial_aid_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rules_updated_at BEFORE UPDATE ON rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sis_integrations_updated_at BEFORE UPDATE ON sis_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();