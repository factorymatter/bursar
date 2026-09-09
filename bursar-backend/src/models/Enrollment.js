const db = require('../config/database');

class Enrollment {
  static async findById(id) {
    const result = await db.query(`
      SELECT e.*, s.sis_student_id, s.first_name, s.last_name,
             sec.section_number, c.course_number, c.title as course_title, c.credits
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN sections sec ON e.section_id = sec.id
      JOIN courses c ON sec.course_id = c.id
      WHERE e.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async findByStudentAndSection(studentId, sectionId) {
    const result = await db.query(
      'SELECT * FROM enrollments WHERE student_id = $1 AND section_id = $2',
      [studentId, sectionId]
    );
    return result.rows[0];
  }

  static async create(data) {
    const {
      student_id,
      section_id,
      institution_id,
      term_id,
      status,
      grade,
      credits_attempted,
      credits_earned,
      is_repeat,
      financial_impact,
      metadata
    } = data;

    const result = await db.query(
      `INSERT INTO enrollments (
        student_id, section_id, institution_id, term_id, status,
        grade, credits_attempted, credits_earned, is_repeat,
        financial_impact, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        student_id, section_id, institution_id, term_id, status || 'enrolled',
        grade, credits_attempted, credits_earned, is_repeat || false,
        financial_impact, metadata || {}
      ]
    );
    return result.rows[0];
  }

  static async updateStatus(id, status, outcomeStatus = null) {
    const updates = ['status = $1'];
    const params = [status];

    if (outcomeStatus) {
      updates.push('outcome_status = $2');
      params.push(outcomeStatus);
    }

    const paramCount = params.length + 1;
    params.push(id);

    const query = `UPDATE enrollments SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async dropEnrollment(studentId, sectionId, outcomeStatus = 'dropped') {
    const result = await db.query(
      `UPDATE enrollments
       SET status = 'dropped', outcome_status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $2 AND section_id = $3 AND status = 'enrolled'
       RETURNING *`,
      [outcomeStatus, studentId, sectionId]
    );
    return result.rows[0];
  }

  static async getStudentActiveEnrollments(studentId, termId) {
    const result = await db.query(`
      SELECT e.*, sec.section_number, c.course_number, c.title as course_title, c.credits
      FROM enrollments e
      JOIN sections sec ON e.section_id = sec.id
      JOIN courses c ON sec.course_id = c.id
      WHERE e.student_id = $1 AND e.term_id = $2 AND e.status = 'enrolled'
    `, [studentId, termId]);
    return result.rows;
  }

  static async getEnrollmentsForWarningEval(studentId, termId) {
    const result = await db.query(`
      SELECT e.*, c.credits as course_credits, sec.section_number
      FROM enrollments e
      JOIN sections sec ON e.section_id = sec.id
      JOIN courses c ON sec.course_id = c.id
      WHERE e.student_id = $1 AND e.term_id = $2 AND e.status = 'enrolled'
    `, [studentId, termId]);
    return result.rows;
  }
}

module.exports = Enrollment;
