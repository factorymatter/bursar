const db = require('../config/database');

class EnrollmentChangeRequest {
  static async findById(id) {
    const result = await db.query(`
      SELECT ecr.*, s.first_name as student_first_name, s.last_name as student_last_name,
             sec.section_number, c.code as course_code, c.title as course_title
      FROM enrollment_change_requests ecr
      JOIN students s ON ecr.student_id = s.id
      JOIN sections sec ON ecr.section_id = sec.id
      JOIN courses c ON sec.course_id = c.id
      WHERE ecr.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async findByStudent(studentId, status = null) {
    let query = `
      SELECT ecr.*, sec.section_number, c.code as course_code, c.title as course_title
      FROM enrollment_change_requests ecr
      JOIN sections sec ON ecr.section_id = sec.id
      JOIN courses c ON sec.course_id = c.id
      WHERE ecr.student_id = $1
    `;
    const params = [studentId];

    if (status) {
      query += ` AND ecr.status = $2`;
      params.push(status);
    }

    query += ' ORDER BY ecr.requested_at DESC';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async create(data) {
    const {
      student_id,
      institution_id,
      section_id,
      term_id,
      change_type,
      reason,
      context_data
    } = data;

    const result = await db.query(
      `INSERT INTO enrollment_change_requests (
        student_id, institution_id, section_id, term_id,
        change_type, reason, context_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        student_id, institution_id, section_id, term_id,
        change_type, reason, context_data || {}
      ]
    );
    return result.rows[0];
  }

  static async updateStatus(id, status, outcomeStatus = null, impactAmount = null) {
    const updates = [`status = $1`];
    const params = [status];

    if (outcomeStatus) {
      updates.push('outcome_status = $' + (params.length + 1));
      params.push(outcomeStatus);
    }

    if (impactAmount !== null) {
      updates.push('financial_impact = $' + (params.length + 1));
      params.push(impactAmount);
    }

    params.push(id);
    const query = `UPDATE enrollment_change_requests SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`;
    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async getPendingRequests(institutionId) {
    const result = await db.query(`
      SELECT ecr.*, s.first_name, s.last_name, s.email as student_email,
             sec.section_number, c.code as course_code, c.title as course_title
      FROM enrollment_change_requests ecr
      JOIN students s ON ecr.student_id = s.id
      JOIN sections sec ON ecr.section_id = sec.id
      JOIN courses c ON sec.course_id = c.id
      WHERE ecr.institution_id = $1
        AND ecr.status = 'pending'
      ORDER BY ecr.requested_at ASC
      LIMIT 100
    `, [institutionId]);
    return result.rows;
  }
}

module.exports = EnrollmentChangeRequest;
