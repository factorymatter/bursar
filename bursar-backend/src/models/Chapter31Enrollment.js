const db = require('../config/database');

class Chapter31Enrollment {
  static async findById(id) {
    const result = await db.query(`
      SELECT c.*, s.first_name, s.last_name, s.email as student_email
      FROM chapter31_enrollments c
      JOIN students s ON c.veteran_id = s.id
      WHERE c.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async findByInstitution(institutionId, filters = {}) {
    let query = `
      SELECT c.*, s.first_name, s.last_name, s.email as student_email
      FROM chapter31_enrollments c
      JOIN students s ON c.veteran_id = s.id
      WHERE c.institution_id = $1
    `;
    const params = [institutionId];

    if (filters.status) {
      query += ` AND c.status = $${params.length + 1}`;
      params.push(filters.status);
    }

    if (filters.veteran_id) {
      query += ` AND c.veteran_id = $${params.length + 1}`;
      params.push(filters.veteran_id);
    }

    if (filters.date_from) {
      query += ` AND c.reporting_date >= $${params.length + 1}`;
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      query += ` AND c.reporting_date <= $${params.length + 1}`;
      params.push(filters.date_to);
    }

    query += ' ORDER BY c.reporting_date DESC, c.created_at DESC';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async create(data) {
    const {
      institution_id,
      veteran_id,
      term_id,
      enrollment_id,
      certification_type,
      tuition_fee,
      books_supplies_fee,
      kicker_fee,
      reporting_date,
      status,
      metadata
    } = data;

    const result = await db.query(
      `INSERT INTO chapter31_enrollments (
        institution_id, veteran_id, term_id, enrollment_id, certification_type,
        tuition_fee, books_supplies_fee, kicker_fee, reporting_date, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        institution_id, veteran_id, term_id, enrollment_id, certification_type,
        tuition_fee || 0, books_supplies_fee || 0, kicker_fee || 0,
        reporting_date, status || 'pending', metadata || {}
      ]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    const allowedFields = [
      'certification_type', 'tuition_fee', 'books_supplies_fee',
      'kicker_fee', 'reporting_date', 'status', 'submitted_to_va_at',
      'paid_at', 'va_response', 'metadata'
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
    const query = `UPDATE chapter31_enrollments SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async markSubmitted(id, submittedAt = new Date()) {
    const result = await db.query(
      'UPDATE chapter31_enrollments SET status = $1, submitted_to_va_at = $2 WHERE id = $3 RETURNING *',
      ['submitted', submittedAt, id]
    );
    return result.rows[0];
  }

  static async markPaid(id, paidAt = new Date(), vaResponse = null) {
    const result = await db.query(
      'UPDATE chapter31_enrollments SET status = $1, paid_at = $2, va_response = $3 WHERE id = $4 RETURNING *',
      ['paid', paidAt, vaResponse, id]
    );
    return result.rows[0];
  }
}

module.exports = Chapter31Enrollment;
