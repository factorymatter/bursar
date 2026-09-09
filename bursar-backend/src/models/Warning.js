const db = require('../config/database');

class Warning {
  static async findById(id) {
    const result = await db.query(`
      SELECT w.*, s.first_name, s.last_name, s.email as student_email,
             a.first_name as advisor_first_name, a.last_name as advisor_last_name, a.email as advisor_email
      FROM warnings w
      JOIN students s ON w.student_id = s.id
      LEFT JOIN advisors a ON w.advisor_id = a.id
      WHERE w.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async findByStudent(studentId, status = null, limit = 50) {
    let query = `
      SELECT w.*, r.name as rule_name, r.category as rule_category
      FROM warnings w
      LEFT JOIN rule_evaluations re ON w.rule_evaluation_id = re.id
      LEFT JOIN rules r ON re.rule_id = r.id
      WHERE w.student_id = $1
    `;
    const params = [studentId];

    if (status) {
      query += ` AND w.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ' ORDER BY w.created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await db.query(query, params);
    return result.rows;
  }

  static async findByAdvisor(advisorId, status = null) {
    let query = `
      SELECT w.*, s.first_name, s.last_name, s.email as student_email
      FROM warnings w
      JOIN students s ON w.student_id = s.id
      WHERE w.advisor_id = $1
    `;
    const params = [advisorId];

    if (status) {
      query += ` AND w.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ' ORDER BY w.created_at DESC';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async findActiveForInstitution(institutionId, options = {}) {
    let query = `
      SELECT w.*, s.first_name, s.last_name, s.email as student_email,
             a.first_name as advisor_first_name, a.last_name as advisor_last_name
      FROM warnings w
      JOIN students s ON w.student_id = s.id
      LEFT JOIN advisors a ON w.advisor_id = a.id
      WHERE w.institution_id = $1 AND w.status = 'active'
    `;
    const params = [institutionId];

    if (options.severity) {
      query += ` AND w.severity = $${params.length + 1}`;
      params.push(options.severity);
    }

    if (options.date_from) {
      query += ` AND w.created_at >= $${params.length + 1}`;
      params.push(options.date_from);
    }

    if (options.date_to) {
      query += ` AND w.created_at <= $${params.length + 1}`;
      params.push(options.date_to);
    }

    query += ' ORDER BY w.created_at DESC LIMIT 100';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async create(data) {
    const {
      student_id,
      institution_id,
      rule_evaluation_id,
      enrollment_change_id,
      severity,
      title,
      message,
      financial_impact,
      aid_types_affected,
      context_data,
      advisor_id,
      appointment_id
    } = data;

    const result = await db.query(
      `INSERT INTO warnings (
        student_id, institution_id, rule_evaluation_id, enrollment_change_id,
        severity, title, message, financial_impact, aid_types_affected,
        context_data, advisor_id, appointment_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        student_id, institution_id, rule_evaluation_id, enrollment_change_id,
        severity, title, message, financial_impact,
        aid_types_affected || [], context_data || {}, advisor_id, appointment_id
      ]
    );
    return result.rows[0];
  }

  static async updateStatus(id, status, resolvedBy = null, resolution = null) {
    const updates = [`status = $1`];
    const params = [status];

    if (status === 'acknowledged') {
      updates.push('acknowledged_at = $' + (params.length + 1));
      params.push(new Date());
    } else if (status === 'resolved') {
      updates.push('resolved_at = $' + (params.length + 1));
      params.push(new Date());
    }

    const paramCount = params.length + 1;
    params.push(id);

    const query = `UPDATE warnings SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async assignAdvisor(id, advisorId) {
    const result = await db.query(
      'UPDATE warnings SET advisor_id = $1 WHERE id = $2 RETURNING *',
      [advisorId, id]
    );
    return result.rows[0];
  }

  static async markShownToStudent(id) {
    const result = await db.query(
      'UPDATE warnings SET shown_to_student_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async getStatsByInstitution(institutionId, dateFrom, dateTo) {
    const result = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE shown_to_student_at IS NOT NULL) as viewed,
        COALESCE(SUM(financial_impact), 0) as total_impact
      FROM warnings
      WHERE institution_id = $1 AND created_at BETWEEN $2 AND $3
    `, [institutionId, dateFrom, dateTo]);
    return result.rows[0];
  }
}

module.exports = Warning;
