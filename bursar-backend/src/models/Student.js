const db = require('../config/database');

class Student {
  static async findById(id) {
    const result = await db.query(`
      SELECT s.*, i.name as institution_name, i.code as institution_code
      FROM students s
      JOIN institutions i ON s.institution_id = i.id
      WHERE s.id = $1 AND s.enrollment_status = $2
    `, [id, 'active']);
    return result.rows[0];
  }

  static async findBySisId(institutionId, sisStudentId) {
    const result = await db.query(
      'SELECT * FROM students WHERE institution_id = $1 AND sis_student_id = $2 AND enrollment_status = $3',
      [institutionId, sisStudentId, 'active']
    );
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT s.*, i.name as institution_name, i.code as institution_code
      FROM students s
      JOIN institutions i ON s.institution_id = i.id
      WHERE s.enrollment_status = $1
    `;
    let params = ['active'];
    let paramCount = 2;

    if (filters.institution_id) {
      query += ` AND s.institution_id = $${paramCount}`;
      params.push(filters.institution_id);
      paramCount++;
    }

    if (filters.sap_status) {
      query += ` AND s.sap_status = $${paramCount}`;
      params.push(filters.sap_status);
      paramCount++;
    }

    if (filters.search) {
      query += ` AND (s.first_name ILIKE $${paramCount} OR s.last_name ILIKE $${paramCount} OR s.email ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    query += ' ORDER BY s.last_name, s.first_name LIMIT 100';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async create(data) {
    const {
      institution_id,
      sis_student_id,
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      program_id,
      expected_completion,
      sap_status,
      sap_effective_date,
      metadata
    } = data;

    const result = await db.query(
      `INSERT INTO students (
        institution_id, sis_student_id, first_name, last_name, email, phone,
        date_of_birth, program_id, expected_completion, sap_status,
        sap_effective_date, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        institution_id, sis_student_id, first_name, last_name, email, phone,
        date_of_birth, program_id, expected_completion, sap_status,
        sap_effective_date, metadata || {}
      ]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'date_of_birth',
      'program_id', 'expected_completion', 'sap_status', 'sap_effective_date',
      'enrollment_status', 'metadata', 'last_sync_at'
    ];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${paramCount}`);
        params.push(data[field]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);
    const query = `UPDATE students SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async getEnrollments(studentId, termId = null) {
    let query = `
      SELECT e.*, c.course_number, c.title as course_title, c.credits as course_credits,
             s.section_number, sec.course_id
      FROM enrollments e
      JOIN sections sec ON e.section_id = sec.id
      JOIN courses c ON sec.course_id = c.id
      WHERE e.student_id = $1 AND e.status = 'enrolled'
    `;
    const params = [studentId];

    if (termId) {
      query += ' AND e.term_id = $2';
      params.push(termId);
    }

    const result = await db.query(query, params);
    return result.rows;
  }

  static async getFinancialAid(studentId, academicYear = null) {
    let query = 'SELECT * FROM financial_aid_packages WHERE student_id = $1';
    const params = [studentId];

    if (academicYear) {
      query += ' AND academic_year = $2';
      params.push(academicYear);
    }

    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async getTotalCredits(studentId, termId) {
    const result = await db.query(`
      SELECT SUM(e.credits_attempted) as total_credits
      FROM enrollments e
      WHERE e.student_id = $1 AND e.term_id = $2 AND e.status = 'enrolled'
    `, [studentId, termId]);
    return result.rows[0].total_credits || 0;
  }

  static async getWarnings(studentId, status = null) {
    let query = `
      SELECT w.*, r.name as rule_name, r.category as rule_category
      FROM warnings w
      LEFT JOIN rule_evaluations re ON w.rule_evaluation_id = re.id
      LEFT JOIN rules r ON re.rule_id = r.id
      WHERE w.student_id = $1
    `;
    const params = [studentId];

    if (status) {
      query += ' AND w.status = $2';
      params.push(status);
    }

    query += ' ORDER BY w.created_at DESC';
    const result = await db.query(query, params);
    return result.rows;
  }
}

module.exports = Student;
