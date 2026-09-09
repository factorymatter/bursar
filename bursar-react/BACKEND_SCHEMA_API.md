# Bursar Backend Design

## Database Schema & API Endpoints

**Version:** 1.0  
**Last Updated:** June 2026  
**System:** Financial Aid Guardrail Platform for Community Colleges

---

## Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [REST API Endpoints](#rest-api-endpoints)
4. [Rules Engine](#rules-engine)
5. [Integration Layer](#integration-layer)
6. [Analytics & Reporting](#analytics--reporting)
7. [Security & Compliance](#security--compliance)

---

## Overview

### Core Purpose
Bursar monitors enrollment changes in real-time and warns students when schedule changes impact financial aid eligibility. The backend evaluates rules against student data, generates warnings, routes to advisors, and tracks outcomes.

### Key Components
- **Student Records**: Demographic, enrollment, academic data
- **Financial Aid Packages**: Pell, SEOG, state grants, institutional aid, loans
- **Rules Engine**: Configurable business rules for aid eligibility
- **Warning System**: Real-time alerts and notifications
- **Advisor Routing**: Assignment and appointment management
- **Integration Layer**: SIS connectors via REST/webhooks
- **Audit & Analytics**: Complete traceability and reporting

---

## Database Schema

### Core Entities

#### 1. institutions
```sql
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "CVCC"
    type VARCHAR(50) DEFAULT 'community_college',
    timezone VARCHAR(50) DEFAULT 'UTC',
    academic_calendar JSONB,  -- term dates, census dates, drop deadlines
    settings JSONB,  -- institution-specific configuration
    sis_type VARCHAR(100),  -- Ellucian Banner, Jenzabar, PeopleSoft, etc.
    sis_config JSONB,  -- API endpoints, credentials (encrypted)
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_institutions_code ON institutions(code);
CREATE INDEX idx_institutions_status ON institutions(status);
```

#### 2. students
```sql
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    sis_student_id VARCHAR(100) NOT NULL,  -- ID from SIS
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    date_of_birth DATE,
    enrollment_status VARCHAR(50) DEFAULT 'active',  -- active, withdrawn, graduated
    program_id UUID,  -- FK to programs
    expected_completion DATE,
    sap_status VARCHAR(50) DEFAULT 'good',  -- good, warning, probation, suspended
    sap_effective_date DATE,
    metadata JSONB,  -- additional SIS sync data
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, sis_student_id)
);

CREATE INDEX idx_students_institution ON students(institution_id);
CREATE INDEX idx_students_sis_id ON students(sis_student_id);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_sap_status ON students(sap_status);
```

#### 3. academic_terms
```sql
CREATE TABLE academic_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,  -- "Fall 2026"
    code VARCHAR(50) NOT NULL,  -- "FALL2026"
    term_type VARCHAR(50) NOT NULL,  -- fall, spring, summer, winter
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    census_date DATE,  -- date when enrollment is "frozen" for aid
    drop_deadline DATE,
    withdrawal_deadline DATE,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_terms_institution ON academic_terms(institution_id);
CREATE INDEX idx_terms_current ON academic_terms(is_current);
```

#### 4. courses
```sql
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    sis_course_id VARCHAR(100) NOT NULL,
    course_number VARCHAR(50) NOT NULL,  -- "ENGL 102"
    title VARCHAR(255) NOT NULL,
    credits DECIMAL(4,2) NOT NULL,  -- e.g., 3.0
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, sis_course_id)
);

CREATE INDEX idx_courses_institution ON courses(institution_id);
CREATE INDEX idx_courses_active ON courses(is_active);
```

#### 5. sections
```sql
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    sis_section_id VARCHAR(100) NOT NULL,
    section_number VARCHAR(20),  -- "001", "002"
    term_id UUID REFERENCES academic_terms(id),
    instructor_id UUID,  -- FK to advisors (if applicable)
    schedule JSONB,  -- meeting times, location
    capacity INTEGER,
    enrolled_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'open',  -- open, closed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, sis_section_id)
);

CREATE INDEX idx_sections_institution ON sections(institution_id);
CREATE INDEX idx_sections_term ON sections(term_id);
CREATE INDEX idx_sections_course ON sections(course_id);
```

#### 6. enrollments
```sql
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    term_id UUID REFERENCES academic_terms(id),
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'enrolled',  -- enrolled, dropped, withdrawn, completed
    grade VARCHAR(2),  -- A, B, C, D, F, W, I, etc.
    credits_attempted DECIMAL(4,2) NOT NULL,
    credits_earned DECIMAL(4,2),
    is_repeat BOOLEAN DEFAULT FALSE,
    financial_impact DECIMAL(10,2),  -- calculated impact on aid
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, section_id)
);

CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_section ON enrollments(section_id);
CREATE INDEX idx_enrollments_term ON enrollments(term_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
```

#### 7. financial_aid_packages
```sql
CREATE TABLE financial_aid_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    academic_year VARCHAR(20) NOT NULL,  -- "2025-2026"
    term_type VARCHAR(50),  -- fall, spring, summer, annual
    pell_grant_amount DECIMAL(10,2) DEFAULT 0,
    pell_credits_required INTEGER DEFAULT 12,
    seog_amount DECIMAL(10,2) DEFAULT 0,
    state_grant_amount DECIMAL(10,2) DEFAULT 0,
    institutional_scholarship DECIMAL(10,2) DEFAULT 0,
    federal_loan_amount DECIMAL(10,2) DEFAULT 0,
    total_aid DECIMAL(10,2) DEFAULT 0,
    disbursement_status VARCHAR(50) DEFAULT 'pending',  -- pending, disbursed, cancelled
    sap_eligibility VARCHAR(50) DEFAULT 'eligible',  -- eligible, warning, ineligible
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
```

#### 8. aid_types
```sql
CREATE TABLE aid_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,  -- "pell", "seog", "state_grant"
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),  -- federal, state, institutional, loan
    is_active BOOLEAN DEFAULT TRUE,
    credit_threshold INTEGER DEFAULT 12,  -- minimum credits for full eligibility
    max_amount DECIMAL(10,2),
    rules JSONB,  -- JSON Schema for rule conditions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, code)
);
```

#### 9. rules
```sql
CREATE TABLE rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(100) NOT NULL,  -- unique rule identifier
    description TEXT,
    category VARCHAR(100) NOT NULL,  -- "credit_threshold", "r2t4", "sap", "deadline"
    severity VARCHAR(50) NOT NULL,  -- "high", "medium", "low", "info"
    conditions JSONB NOT NULL,  -- rule conditions (see Rules Engine section)
    actions JSONB NOT NULL,  -- what to do when rule fires (alert, route, notify)
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 100,  -- lower number = higher priority
    institution_specific BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES advisors(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, code)
);

CREATE INDEX idx_rules_institution ON rules(institution_id);
CREATE INDEX idx_rules_category ON rules(category);
CREATE INDEX idx_rules_active ON rules(is_active);
CREATE INDEX idx_rules_priority ON rules(priority);
```

#### 10. rule_evaluations
```sql
CREATE TABLE rule_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES rules(id),
    student_id UUID NOT NULL REFERENCES students(id),
    enrollment_change_id UUID,  -- FK to enrollment_change_requests (if applicable)
    context_data JSONB NOT NULL,  -- snapshot of data used in evaluation
    result VARCHAR(50) NOT NULL,  -- "fired", "cleared", "error"
    triggered_conditions JSONB,  -- which conditions matched
    calculated_impact DECIMAL(10,2),  -- financial impact if any
    evaluation_time_ms INTEGER,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rule_evaluations_rule ON rule_evaluations(rule_id);
CREATE INDEX idx_rule_evaluations_student ON rule_evaluations(student_id);
CREATE INDEX idx_rule_evaluations_at ON rule_evaluations(evaluated_at);
```

#### 11. warnings
```sql
CREATE TABLE warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    rule_evaluation_id UUID REFERENCES rule_evaluations(id),
    enrollment_change_id UUID,  -- optional link to change request
    severity VARCHAR(50) NOT NULL,  -- high, medium, low
    title VARCHAR(300) NOT NULL,
    message TEXT NOT NULL,
    financial_impact DECIMAL(10,2),  -- estimated loss/gain
    aid_types_affected JSONB,  -- ["pell", "seog"]
    context_data JSONB,  -- full context snapshot
    status VARCHAR(50) DEFAULT 'active',  -- active, acknowledged, resolved, dismissed
    advisor_id UUID REFERENCES advisors(id),  -- assigned advisor
    appointment_id UUID,  -- linked appointment
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
```

#### 12. advisors
```sql
CREATE TABLE advisors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    sis_advisor_id VARCHAR(100),  -- optional SIS reference
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    title VARCHAR(200),  -- "Director of Financial Aid"
    department VARCHAR(100),  -- "Financial Aid", "Academic", "Retention"
    caseload_capacity INTEGER DEFAULT 50,
    current_caseload INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    specialties JSONB,  -- ["sap_appeals", "pell_issues"]
    availability JSONB,  -- calendar/schedule data
    timezone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, email)
);

CREATE INDEX idx_advisors_institution ON advisors(institution_id);
CREATE INDEX idx_advisors_department ON advisors(department);
CREATE INDEX idx_advisors_active ON advisors(is_active);
```

#### 13. advisor_assignments
```sql
CREATE TABLE advisor_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES advisors(id),  -- who made the assignment
    reason VARCHAR(200),  -- "warning_routing", "manual", "sap_appeal"
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(student_id, advisor_id, institution_id)
);

CREATE INDEX idx_assignments_student ON advisor_assignments(student_id);
CREATE INDEX idx_assignments_advisor ON advisor_assignments(advisor_id);
```

#### 14. appointments
```sql
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id),
    advisor_id UUID NOT NULL REFERENCES advisors(id),
    warning_id UUID REFERENCES warnings(id),
    appointment_type VARCHAR(100) NOT NULL,  -- "financial_aid_consultation", "sap_appeal_review"
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'scheduled',  -- scheduled, completed, cancelled, no_show
    location_type VARCHAR(50) DEFAULT 'virtual',  -- virtual, in_person, phone
    location_details JSONB,  -- zoom link, room number
    notes TEXT,
    created_via VARCHAR(50) DEFAULT 'advisor_routing',  -- advisor_routing, student_self_schedule, manual
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_appointments_student ON appointments(student_id);
CREATE INDEX idx_appointments_advisor ON appointments(advisor_id);
CREATE INDEX idx_appointments_warning ON appointments(warning_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_start);
```

#### 15. sis_integrations
```sql
CREATE TABLE sis_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,  -- "Banner 9", "Jenzabar EX"
    type VARCHAR(100) NOT NULL,  -- "ellucian_banner", "jenzabar_ex", "peoplesoft", "custom"
    base_url VARCHAR(500) NOT NULL,
    api_version VARCHAR(50),
    credentials JSONB NOT NULL,  -- encrypted API keys, OAuth tokens
    webhook_secret VARCHAR(255),  -- for signature verification
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(50),  -- success, failed, in_progress
    sync_error TEXT,
    config JSONB,  -- sync settings, field mappings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, type)
);

CREATE INDEX idx_sis_integrations_institution ON sis_integrations(institution_id);
CREATE INDEX idx_sis_integrations_active ON sis_integrations(is_active);
```

#### 16. enrollment_change_requests
```sql
CREATE TABLE enrollment_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    section_id UUID NOT NULL REFERENCES sections(id),
    change_type VARCHAR(50) NOT NULL,  -- "add", "drop", "withdraw", "section_change"
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    requested_ip INET,
    user_agent TEXT,
    status VARCHAR(50) DEFAULT 'pending',  -- pending, approved, rejected, completed
    outcome_status VARCHAR(50),  -- enrolled, dropped, etc. after processing
    risk_assessment JSONB,  -- pre-evaluation results if available
    evaluated_at TIMESTAMP WITH TIME ZONE,
    evaluation_results JSONB,
    metadata JSONB
);

CREATE INDEX idx_change_requests_student ON enrollment_change_requests(student_id);
CREATE INDEX idx_change_requests_status ON enrollment_change_requests(status);
CREATE INDEX idx_change_requests_at ON enrollment_change_requests(requested_at);
```

#### 17. audit_logs
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    actor_type VARCHAR(50) NOT NULL,  -- "student", "advisor", "admin", "system", "api"
    actor_id UUID,  -- user ID if applicable
    action VARCHAR(100) NOT NULL,  -- "rule_evaluated", "warning_sent", "student_alert_viewed"
    resource_type VARCHAR(50),  -- "warning", "rule", "student"
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
```

#### 18. notifications
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warning_id UUID NOT NULL REFERENCES warnings(id),
    student_id UUID NOT NULL REFERENCES students(id),
    channel VARCHAR(50) NOT NULL,  -- "portal", "email", "sms", "push"
    status VARCHAR(50) DEFAULT 'pending',  -- pending, sent, delivered, failed, read
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
```

#### 19. advisor_availability
```sql
CREATE TABLE advisor_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,  -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    recurrence VARCHAR(50) DEFAULT 'weekly',  -- weekly, biweekly, monthly
    effective_date DATE,
    expiration_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_advisor_availability_advisor ON advisor_availability(advisor_id);
```

#### 20. sap_appeals
```sql
CREATE TABLE sap_appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    warning_id UUID REFERENCES warnings(id),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'submitted',  -- submitted, under_review, approved, denied
    reason TEXT NOT NULL,  -- student's explanation
    supporting_documents JSONB,  -- URLs to uploaded docs
    reviewed_by UUID REFERENCES advisors(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    decision TEXT,
    appeal_outcome VARCHAR(50),  -- "approved", "denied", "partial"
    new_sap_status VARCHAR(50),
    conditions JSONB,  -- conditions if approved
    metadata JSONB
);

CREATE INDEX idx_sap_appeals_student ON sap_appeals(student_id);
CREATE INDEX idx_sap_appeals_status ON sap_appeals(status);
```

#### 21. analytics_daily_summary
```sql
CREATE TABLE analytics_daily_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    retention_impact_estimate INTEGER DEFAULT 0,  -- students kept enrolled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, summary_date)
);

CREATE INDEX idx_analytics_daily_institution ON analytics_daily_summary(institution_id);
CREATE INDEX idx_analytics_daily_date ON analytics_daily_summary(summary_date);
```

---

## REST API Endpoints

### Base URL
```
https://api.bursar.io/v1
```

### Authentication
All endpoints require a Bearer token from OAuth 2.0 / JWT. Tokens include scopes for institution and role (admin, advisor, student_readonly).

```
Authorization: Bearer <access_token>
```

---

### 1. Institutions

#### GET /institutions
List accessible institutions.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Central Valley Community College",
      "code": "CVCC",
      "type": "community_college",
      "sis_type": "ellucian_banner",
      "status": "active",
      "created_at": "2026-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 1
  }
}
```

#### GET /institutions/{id}
Get institution details.

**Response:** Institution object with settings, academic calendar, SIS config (redacted).

---

### 2. Students

#### GET /students
List students with filters.

**Query Params:**
- `institution_id` (required)
- `enrollment_status` (optional)
- `program_id` (optional)
- `search` (optional) - search name/email
- `page`, `per_page`

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "sis_student_id": "STU0029314",
      "first_name": "Maria",
      "last_name": "Garcia",
      "email": "maria.garcia@email.edu",
      "enrollment_status": "active",
      "program": "Associate of Arts",
      "sap_status": "good",
      "created_at": "2026-01-10T14:22:00Z"
    }
  ]
}
```

#### GET /students/{id}
Get student details including enrollments and aid packages.

**Response:** Full student object with nested enrollments, financial aid, warnings, assignments.

#### GET /students/{id}/enrollments
List student enrollments.

**Query Params:**
- `term_id` (optional)
- `status` (optional)

#### POST /students/{id}/enrollments
Create enrollment (triggered by SIS sync). This endpoint is typically called by integration layer, not directly by UI.

#### GET /students/{id}/financial-aid
Get student's financial aid packages.

**Query Params:**
- `academic_year` (optional)

#### GET /students/{id}/warnings
Get all warnings for a student.

**Query Params:**
- `status` (optional: active, acknowledged, resolved)
- `severity` (optional)

---

### 3. Enrollment Change Requests (Real-time Evaluation)

#### POST /enrollment-changes/evaluate
Evaluate enrollment change before it's committed. This is the core real-time endpoint called by SIS or registration portal.

**Request:**
```json
{
  "institution_id": "uuid",
  "student_id": "uuid",
  "change_type": "drop",
  "section_id": "uuid",
  "context": {
    "requested_by": "student",  // student, advisor, admin
    "requested_ip": "192.168.1.1",
    "user_agent": "Mozilla/5.0..."
  }
}
```

**Response:**
```json
{
  "request_id": "uuid",
  "student": { /* student snapshot */ },
  "change": { /* change details */ },
  "risk_assessment": {
    "overall_risk": "high",
    "financial_impact": -1400.00,
    "aid_types_affected": ["pell", "seog"],
    "warnings": [
      {
        "rule_id": "uuid",
        "rule_name": "Credit Threshold Drop",
        "severity": "high",
        "title": "Credit Hours Below Full-Time",
        "message": "Dropping this course reduces your credits to 8, below the 12 required for full-time Pell eligibility.",
        "financial_impact": -1400.00,
        "advisor_routing": {
          "department": "financial_aid",
          "reason": "pell_eligibility_warning"
        },
        "actions": {
          "show_alert": true,
          "require_acknowledgment": false,
          "route_to_advisor": true
        }
      }
    ],
    "recommendations": [
      "Contact financial aid advisor before proceeding",
      "Consider adding another course to maintain full-time status"
    ]
  },
  "can_proceed": false,  // if institution requires advisor approval
  "requires_approval": false
}
```

#### POST /enrollment-changes/{request_id}/commit
Commit the enrollment change after warnings acknowledged.

---

### 4. Rules Engine

#### GET /rules
List rules for an institution.

**Query Params:**
- `institution_id` (required)
- `category` (optional)
- `is_active` (optional, default true)
- `page`, `per_page`

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Credit Threshold Drop",
      "code": "credit_threshold_drop_v1",
      "category": "credit_threshold",
      "severity": "high",
      "description": "Triggers when dropping below full-time threshold (12 credits)",
      "conditions": {
        "type": "all",
        "conditions": [
          {
            "field": "credits_after_change",
            "operator": "lt",
            "value": 12
          },
          {
            "field": "current_aid_type",
            "operator": "in",
            "value": ["pell", "seog"]
          }
        ]
      },
      "actions": {
        "alert_student": true,
        "route_to_advisor": {
          "department": "financial_aid",
          "urgency": "high"
        },
        "notify_advisor": ["email", "portal"]
      },
      "priority": 10,
      "is_active": true,
      "created_at": "2026-01-05T10:00:00Z"
    }
  ]
}
```

#### POST /rules
Create rule (admin only).

**Request:** Rule object (see response above, minus id/timestamps).

#### GET /rules/{id}
Get rule details.

#### PUT /rules/{id}
Update rule.

#### DELETE /rules/{id}
Deactivate rule (soft delete).

#### POST /rules/{id}/test
Test rule against sample student data.

**Request:**
```json
{
  "student_id": "uuid",
  "simulated_change": {
    "change_type": "drop",
    "section_id": "uuid"
  }
}
```

**Response:** Same as evaluation endpoint, but doesn't persist.

---

### 5. Warnings

#### GET /warnings
List warnings with filters.

**Query Params:**
- `institution_id` (required)
- `student_id` (optional)
- `status` (optional)
- `severity` (optional)
- `date_from`, `date_to`
- `page`, `per_page`

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "student": {
        "id": "uuid",
        "name": "Maria Garcia",
        "sis_student_id": "STU0029314"
      },
      "rule_name": "Credit Threshold Drop",
      "severity": "high",
      "title": "Credit Hours Below Full-Time",
      "message": "Dropping this course reduces your credits to 8...",
      "financial_impact": -1400.00,
      "status": "active",
      "advisor": {
        "id": "uuid",
        "name": "Sarah Reyes",
        "email": "sarah.reyes@college.edu"
      },
      "created_at": "2026-06-25T14:32:08Z",
      "shown_to_student_at": null,
      "acknowledged_at": null
    }
  ],
  "pagination": { "page": 1, "per_page": 50, "total": 247 }
}
```

#### GET /warnings/{id}
Get warning details including full context and history.

#### PUT /warnings/{id}/acknowledge
Advisor acknowledges warning.

**Request:**
```json
{
  "advisor_id": "uuid",
  "notes": "Contacted student, scheduled appointment"
}
```

#### PUT /warnings/{id}/resolve
Mark warning as resolved.

**Request:**
```json
{
  "resolution": "student_retained_aid",  // student_retained_aid, student_dropped, aid_lost, other
  "notes": "Student added additional course to maintain full-time status"
}
```

#### POST /warnings/{id}/route
Re-route to different advisor.

**Request:**
```json
{
  "new_advisor_id": "uuid",
  "reason": "specialist_needed"
}
```

---

### 6. Advisor Management

#### GET /advisors
List advisors.

**Query Params:**
- `institution_id` (required)
- `department` (optional)
- `is_active` (optional)
- `availability` (optional: "available", "unavailable")

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "first_name": "Sarah",
      "last_name": "Reyes",
      "email": "sarah.reyes@college.edu",
      "title": "Director of Financial Aid",
      "department": "financial_aid",
      "current_caseload": 42,
      "caseload_capacity": 50,
      "specialties": ["pell_issues", "sap_appeals"],
      "availability": {
        "next_available": "2025-06-25T14:00:00Z",
        "timezone": "America/Los_Angeles"
      }
    }
  ]
}
```

#### GET /advisors/{id}/schedule
Get advisor's appointment slots.

**Query Params:**
- `date_from` (required)
- `date_to` (required)

**Response:**
```json
{
  "advisor": { /* advisor info */ },
  "availability": [
    {
      "date": "2025-06-26",
      "slots": [
        { "start": "09:00", "end": "09:30", "is_booked": false },
        { "start": "09:30", "end": "10:00", "is_booked": true }
      ]
    }
  ]
}
```

#### POST /advisors/{id}/appointments
Book appointment.

**Request:**
```json
{
  "student_id": "uuid",
  "warning_id": "uuid",
  "appointment_type": "financial_aid_consultation",
  "scheduled_start": "2025-06-26T14:00:00Z",
  "scheduled_end": "2025-06-26T14:30:00Z",
  "location_type": "virtual",
  "location_details": {
    "zoom_link": "https://zoom.us/j/123456789"
  }
}
```

---

### 7. Students Portal API

#### GET /students/me/profile
Get current student profile (student authenticated).

#### GET /students/me/enrollments
List student's current enrollments.

#### GET /students/me/financial-aid
Get student's aid packages.

#### GET /students/me/warnings
Get student's active warnings.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Credit Hours Below Full-Time",
      "message": "Dropping ENGL 102 reduces your credits to 8...",
      "severity": "high",
      "financial_impact": -1400.00,
      "aid_types_affected": ["pell"],
      "advisor": {
        "name": "Sarah Reyes",
        "email": "sarah.reyes@college.edu",
        "next_available": "2025-06-25T14:00:00Z"
      },
      "can_proceed_without_approval": false,
      "created_at": "2025-06-25T14:32:08Z"
    }
  ]
}
```

#### POST /students/me/warnings/{id}/acknowledge
Student acknowledges warning.

#### GET /students/me/appointments
List student's appointments.

#### POST /students/me/appointments
Book appointment with advisor.

---

### 8. SIS Integration Endpoints

#### POST /webhooks/sis/enrollment-change
Inbound webhook from SIS when enrollment change requested.

**Headers:**
```
X-SIS-Signature: <HMAC signature>
X-SIS-Timestamp: <ISO timestamp>
```

**Request:**
```json
{
  "institution_id": "uuid",
  "event_type": "enrollment_change_requested",
  "payload": {
    "student_id": "STU0029314",
    "section_id": "SEC001234",
    "change_type": "drop",
    "timestamp": "2025-06-25T14:32:08Z",
    "requested_by": "student",
    "requested_ip": "192.168.1.1"
  }
}
```

**Response:**
```json
{
  "request_id": "uuid",
  "status": "evaluated",
  "risk_assessment": { /* as above */ },
  "action_taken": "warning_issued"  // warning_issued, blocked, approved
}
```

#### GET /webhooks/sis/status
Health check for SIS integrations.

---

### 9. Analytics Endpoints

#### GET /analytics/dashboard
Get institution dashboard metrics.

**Query Params:**
- `institution_id` (required)
- `date_from` (optional, default 30 days ago)
- `date_to` (optional, default today)

**Response:**
```json
{
  "summary": {
    "period": "2025-06-01 - 2025-06-25",
    "total_warnings": 247,
    "warnings_viewed": 198,
    "acknowledged": 156,
    "appointments_scheduled": 89,
    "appointments_completed": 67,
    "estimated_aid_loss_prevented": 185400.00,
    "retention_impact": 42
  },
  "by_severity": [
    { "severity": "high", "count": 45 },
    { "severity": "medium", "count": 112 },
    { "severity": "low", "count": 90 }
  ],
  "by_category": [
    { "category": "credit_threshold", "count": 134 },
    { "category": "sap", "count": 67 },
    { "category": "r2t4", "count": 28 },
    { "category": "deadline", "count": 18 }
  ],
  "top_students_at_risk": [
    {
      "student_id": "STU0029314",
      "name": "Maria Garcia",
      "warning_count": 4,
      "total_impact": -3200.00
    }
  ]
}
```

#### GET /analytics/retention-impact
Calculate retention impact metrics.

**Query Params:**
- `institution_id` (required)
- `academic_year` (optional)

**Response:**
```json
{
  "institution": "Central Valley CC",
  "academic_year": "2025-2026",
  "cohort_size": 5234,
  "students_with_warnings": 847,
  "students_who_retained": 689,
  "retention_rate_improvement": 0.082,  // 8.2% improvement over baseline
  "aid_loss_prevented_total": 842300.00
}
```

#### GET /analytics/advisor-performance
Advisor metrics.

**Response:**
```json
{
  "advisors": [
    {
      "id": "uuid",
      "name": "Sarah Reyes",
      "caseload_current": 42,
      "warnings_assigned": 156,
      "warnings_resolved": 134,
      "appointments_completed": 89,
      "avg_resolution_time_hours": 26.5,
      "student_satisfaction_score": 4.8
    }
  ]
}
```

---

### 10. SAP Appeals

#### GET /sap-appeals
List appeals.

**Query Params:**
- `institution_id` (required)
- `student_id` (optional)
- `status` (optional)

#### POST /sap-appeals
Submit appeal.

**Request:**
```json
{
  "student_id": "uuid",
  "warning_id": "uuid",
  "reason": "Family medical emergency affected my studies",
  "supporting_documents": [
    {
      "type": "medical_certificate",
      "url": "https://storage.bursar.io/docs/abc123.pdf"
    }
  ]
}
```

#### PUT /sap-appeals/{id}/review
Review and decide appeal.

**Request:**
```json
{
  "reviewed_by": "uuid",
  "decision": "approved",
  "appeal_outcome": "approved",
  "new_sap_status": "good",
  "conditions": "Must maintain 2.0 GPA next semester",
  "notes": "Student demonstrates mitigating circumstances"
}
```

---

### 11. Audit Logs

#### GET /audit-logs
Query audit trail (admin only).

**Query Params:**
- `institution_id` (required)
- `actor_type`, `actor_id`
- `action`
- `date_from`, `date_to`
- `page`, `per_page`

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "actor": {
        "type": "advisor",
        "id": "uuid",
        "name": "Sarah Reyes"
      },
      "action": "warning_acknowledged",
      "resource_type": "warning",
      "resource_id": "uuid",
      "metadata": { "notes": "Contacted student" },
      "created_at": "2025-06-25T14:35:00Z"
    }
  ]
}
```

---

### 12. Notifications (Async)

#### POST /notifications/send
Send notification (internal).

**Request:**
```json
{
  "warning_id": "uuid",
  "student_id": "uuid",
  "channels": ["email", "sms"],
  "template": "warning_notification"
}
```

---

### 13. Health & Status

#### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-06-25T14:40:00Z",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "external_services": {
      "ses": "healthy",
      "twilio": "healthy"
    }
  }
}
```

#### GET /status/integration/{institution_id}
SIS integration health.

---

## Rules Engine Implementation

### Rule Structure

```json
{
  "conditions": {
    "type": "all|any",
    "conditions": [
      {
        "field": "credits_after_change",
        "operator": "lt|lte|eq|neq|gt|gte",
        "value": 12
      },
      {
        "field": "term_type",
        "operator": "in",
        "value": ["fall", "spring"]
      },
      {
        "field": "current_aid.pell_grant_amount",
        "operator": "gt",
        "value": 0
      },
      {
        "field": "student.sap_status",
        "operator": "in",
        "value": ["good", "warning"]
      },
      {
        "field": "days_until_term_end",
        "operator": "lte",
        "value": 30
      }
    ]
  },
  "actions": {
    "alert_student": {
      "title": "Credit Hours Below Full-Time",
      "message": "Dropping {course} reduces your credits to {credits_after}, below the 12 required for full-time Pell eligibility.",
      "show_financial_impact": true,
      "display_location": "registration_portal"
    },
    "route_to_advisor": {
      "department": "financial_aid",
      "urgency": "high",
      "reason": "credit_threshold_warning"
    },
    "notify_advisor": {
      "channels": ["email", "portal"],
      "template": "new_student_warning"
    },
    "log_audit": true
  }
}
```

### Supported Operators
- `eq`, `neq` (equals, not equals)
- `lt`, `lte`, `gt`, `gte` (comparison)
- `in`, `not_in` (membership)
- `contains`, `not_contains` (string)
- `matches` (regex)
- `is_null`, `is_not_null`

### Dynamic Placeholders
Messages support placeholders from context:
- `{student.first_name}`
- `{course}`
- `{credits_before}`, `{credits_after}`
- `{aid_type}`
- `{current_aid_amount}`, `{new_aid_amount}`
- `{financial_impact}`

These are replaced at evaluation time.

---

## Integration Layer

### SIS Connectors

#### Supported Systems
- Ellucian Banner (REST API)
- Jenzabar EX (REST API)
- PeopleSoft Campus Solutions (PeopleTools API)
- Workday Student (REST)
- Anthology/Colleague (Web API)
- Custom REST APIs

#### Inbound Webhooks

**Enrollment Change Event**
```
POST /webhooks/sis/enrollment-change
Signature: HMAC-SHA256(secret, payload)
```

**Student Update Event**
```
POST /webhooks/sis/student-update
```

**Aid Package Sync**
```
POST /webhooks/sis/aid-update
```

#### Outbound Calls

Bursar sends evaluation results to SIS if needed for blocking/suspending transactions.

**Block Enrollment Change**
```
POST {SIS_BASE_URL}/api/enrollments/block
Authorization: Bearer <token>
```

**Payload:**
```json
{
  "student_id": "STU0029314",
  "section_id": "SEC001234",
  "block_reason": "financial_aid_warning",
  "warning_id": "uuid",
  "requires_advisor_approval": true
}
```

---

## Analytics Data Models

### Daily Summary Job

Nightly batch job calculates:

```sql
INSERT INTO analytics_daily_summary (
  institution_id,
  summary_date,
  active_students,
  total_enrollments,
  aid_packages_count,
  warnings_generated,
  warnings_viewed_by_students,
  warnings_acknowledged,
  advisor_assignments_made,
  appointments_scheduled,
  appointments_completed,
  aid_loss_prevented_estimate,
  retention_impact_estimate
)
SELECT
  i.id,
  CURRENT_DATE - INTERVAL '1 day',
  COUNT(DISTINCT s.id) FILTER (WHERE s.enrollment_status = 'active'),
  COUNT(e.id),
  COUNT(DISTINCT f.id),
  COUNT(w.id),
  COUNT(w.id) FILTER (WHERE w.shown_to_student_at IS NOT NULL),
  COUNT(w.id) FILTER (WHERE w.acknowledged_at IS NOT NULL),
  COUNT(a.id) FILTER (WHERE a.assigned_at >= CURRENT_DATE - INTERVAL '1 day'),
  COUNT(ap.id) FILTER (WHERE ap.created_at >= CURRENT_DATE - INTERVAL '1 day'),
  COUNT(ap.id) FILTER (WHERE ap.status = 'completed' AND ap.scheduled_start >= CURRENT_DATE - INTERVAL '1 day'),
  COALESCE(SUM(COALESCE(w.financial_impact, 0) * 0.7), 0),  -- 70% prevention rate assumption
  COUNT(DISTINCT w.student_id) FILTER (WHERE w.acknowledged_at IS NOT NULL AND ap.status = 'completed')
FROM institutions i
LEFT JOIN students s ON s.institution_id = i.id
LEFT JOIN enrollments e ON e.student_id = s.id
LEFT JOIN financial_aid_packages f ON f.student_id = s.id
LEFT JOIN warnings w ON w.institution_id = i.id AND w.created_at >= CURRENT_DATE - INTERVAL '1 day'
LEFT JOIN advisor_assignments a ON a.student_id = w.student_id
LEFT JOIN appointments ap ON ap.warning_id = w.id
GROUP BY i.id;
```

---

## Security & Compliance

### Data Encryption
- All PII encrypted at rest (AES-256)
- Column-level encryption for SSN, DOB if stored
- TLS 1.3 in transit
- Secrets managed via vault (AWS KMS, Azure Key Vault)

### FERPA Compliance
- Role-based access control: students can only view their own records
- Advisors see only assigned students
- Admins have read-only access to aggregated metrics
- Complete audit trail of all data access
- Data processing agreements (DPA) with institutions
- Right to be forgotten: DELETE endpoints for student data removal

### Authentication & Authorization

**OAuth 2.0 Scopes:**
- `institution:read` - read institution data
- `students:read` - read student records
- `warnings:read` - read warnings
- `warnings:write` - acknowledge/resolve warnings
- `advisors:read` - read advisor data
- `advisors:write` - book appointments, modify assignments
- `rules:read` - read rule definitions
- `rules:write` - create/modify rules (admin only)
- `analytics:read` - read analytics
- `audit:read` - read audit logs (admin only)

---

## Technology Stack Recommendations

- **Database**: PostgreSQL 15+ with pgcrypto, JSONB support
- **Cache**: Redis for session storage, rate limiting, real-time pub/sub
- **API**: Node.js + Express or Python + FastAPI
- **Queue**: RabbitMQ or AWS SQS for async notifications
- **Storage**: S3-compatible for document uploads (SAP appeals)
- **Search**: Elasticsearch for student search
- **Monitoring**: Prometheus + Grafana, Sentry for errors
- **Logging**: Structured JSON logs, Loki/ELK stack

---

## API Rate Limits

- General endpoints: 100 req/min per token
- Bulk operations: 10 req/min per token
- Webhook endpoints: 1000 req/min per institution (whitelisted IPs)
- Student portal: 60 req/min per user

---

## Error Handling

Standard HTTP status codes:
- 200 OK
- 201 Created
- 400 Bad Request (validation error)
- 401 Unauthorized
- 403 Forbidden (insufficient scope)
- 404 Not Found
- 409 Conflict (duplicate, optimistic lock)
- 422 Unprocessable Entity (business rule violation)
- 429 Too Many Requests
- 500 Internal Server Error
- 503 Service Unavailable

Error response format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request: student_id is required",
    "details": { "field": "student_id", "issue": "required" }
  },
  "request_id": "uuid"
}
```

---

## Pagination

List endpoints use cursor-based pagination:
```
GET /warnings?cursor=eyJpZCI6MTIzfQ&limit=50
```

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MzY0fQ",
    "has_more": true,
    "count": 50
  }
}
```

---

## Webhook Retry Policy

- Retry failed webhook calls up to 3 times
- Exponential backoff: 1s, 5s, 30s
- After 3 failures, alert integration team
- Maintain webhook delivery logs for 90 days

---

## Implementation Phases

### Phase 1 (Core)
- Student records, enrollments, aid packages
- Basic rule evaluation (credit thresholds)
- Warning generation
- Student portal API

### Phase 2 (Advisor Workflows)
- Advisor assignments
- Appointment booking
- Email notifications
- Audit logging

### Phase 3 (Advanced Rules)
- SAP evaluation
- R2T4 calculations
- Deadline tracking
- Custom rule builder UI

### Phase 4 (Analytics)
- Daily summary aggregation
- Retention impact reporting
- Advisor performance metrics
- Accreditation reports

### Phase 5 (Integrations)
- SIS webhook endpoints
- Multi-SIS support
- Bi-directional sync
- Integration health monitoring

---

## Sample Queries

### Get all warnings for a student with advisor info:
```sql
SELECT w.*, a.first_name, a.last_name, a.email as advisor_email
FROM warnings w
LEFT JOIN advisors a ON w.advisor_id = a.id
WHERE w.student_id = 'uuid' AND w.status = 'active'
ORDER BY w.created_at DESC;
```

### Find students at risk of losing Pell:
```sql
SELECT s.*, e.credits_attempted, f.pell_grant_amount
FROM students s
JOIN enrollments e ON e.student_id = s.id
JOIN financial_aid_packages f ON f.student_id = s.id
WHERE e.term_id = 'current_term'
  AND e.status = 'enrolled'
  AND f.pell_grant_amount > 0
  AND e.credits_attempted < f.pell_credits_required
  AND f.sap_eligibility = 'eligible';
```

### Advisor caseload:
```sql
SELECT a.id, a.first_name, a.last_name, COUNT(DISTINCT w.student_id) as active_warnings
FROM advisors a
LEFT JOIN warnings w ON w.advisor_id = a.id AND w.status = 'active'
GROUP BY a.id
ORDER BY active_warnings DESC;
```

---

## Database Maintenance

### Indexes (Recommended)
```sql
-- Composite indexes for common queries
CREATE INDEX idx_warnings_student_status ON warnings(student_id, status);
CREATE INDEX idx_warnings_created_status ON warnings(created_at, status);
CREATE INDEX idx_enrollments_student_term ON enrollments(student_id, term_id);
CREATE INDEX idx_fa_packages_student_year ON financial_aid_packages(student_id, academic_year);
```

### Vacuum & Analyze
Schedule weekly:
```sql
VACUUM ANALYZE warnings;
VACUUM ANALYZE rule_evaluations;
VACUUM ANALYZE enrollments;
```

### Partitioning (for large tables)
Partition `warnings` and `audit_logs` by `created_at` monthly:
```sql
CREATE TABLE warnings_2026_06 PARTITION OF warnings
FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
```

---

## Environment Variables

```
DATABASE_URL=postgresql://user:pass@host:5432/bursar
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
SIS_WEBHOOK_SECRET=webhook-secret
AWS_S3_BUCKET=bursar-docs
SMTP_SERVER=smtp.sendgrid.net
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
```

---

This comprehensive design covers all core Bursar functionality and can be implemented incrementally based on priorities.
