const db = require('../config/database');

class SAPAppeal {
  static async findById(id) {
    const result = await db.query(`
      SELECT a.*, s.first_name, s.last_name, s.email as student_email
      FROM sap_appeals a
      JOIN students s ON a.student_id = s.id
      WHERE a.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async findByStudent(studentId, status = null) {
    let query = `
      SELECT * FROM sap_appeals
      WHERE student_id = $1
    `;
    const params = [studentId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ' ORDER BY submitted_at DESC';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async create(data) {
    const {
      student_id,
      institution_id,
      term_id,
      appeal_type,
      reason,
      supporting_documents,
      requested_action,
      impact_credits,
      impact_grades
    } = data;

    const result = await db.query(
      `INSERT INTO sap_appeals (
        student_id, institution_id, term_id, appeal_type,
        reason, supporting_documents, requested_action,
        impact_credits, impact_grades
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        student_id, institution_id, term_id, appeal_type,
        reason, supporting_documents || [], requested_action,
        impact_credits || [], impact_grades || []
      ]
    );
    return result.rows[0];
  }

  static async updateStatus(id, status, decisionBy = null, decisionNotes = null,DecisionDate = null) {
    const updates = [`status = $1`];
    const params = [status];

    if (decisionBy) {
      updates.push('decision_by = $' + (params.length + 1));
      params.push(decisionBy);
    }

    if (decisionNotes) {
      updates.push('decision_notes = $' + (params.length + 1));
      params.push(decisionNotes);
    }

    if (decisionDate) {
      updates.push('decision_date = $' + (params.length + 1));
      params.push(decisionDate);
    }

    if (status === 'approved' || status === 'denied') {
      updates.push('decision_date = $' + (params.length + 1));
      params.push(new Date());
    }

    params.push(id);
    const query = `UPDATE sap_appeals SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`;
    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async updateSAPStatus(studentId, newStatus, effectiveDate, appealId) {
    const result = await db.query(
      'UPDATE students SET sap_status = $1, sap_effective_date = $2 WHERE id = $3 RETURNING *',
      [newStatus, effectiveDate, studentId]
    );

    // Log this change in audit
    await db.query(
      `INSERT INTO audit_logs (
        institution_id, actor_type, actor_id, action,
        resource_type, resource_id, after_state
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        null, // institution_id can be fetched if needed
        'system',
        'sap-appeal',
        'update',
        'student',
        studentId,
        JSON.stringify({ sap_status: newStatus, sap_effective_date: effectiveDate, appeal_id: appealId })
      ]
    );

    return result.rows[0];
  }

  static async getStatsByInstitution(institutionId, dateFrom, dateTo) {
    const result = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'denied') as denied,
        COUNT(*) FILTER (WHERE status = 'withdrawn') as withdrawn,
        COUNT(*) FILTER (WHERE appeal_type = 'satisfactory_progress') as sap_appeals,
        COUNT(*) FILTER (WHERE appeal_type = 'maximum_timeframe') as max_timeframe_appeals
      FROM sap_appeals
      WHERE institution_id = $1 AND submitted_at BETWEEN $2 AND $3
    `, [institutionId, dateFrom, dateTo]);
    return result.rows[0];
  }
}

module.exports = SAPAppeal;
