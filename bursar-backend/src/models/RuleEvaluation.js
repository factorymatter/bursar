const db = require('../config/database');

class RuleEvaluation {
  static async findById(id) {
    const result = await db.query(`
      SELECT re.*, r.name as rule_name, r.category as rule_category
      FROM rule_evaluations re
      JOIN rules r ON re.rule_id = r.id
      WHERE re.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async findByStudent(studentId, dateFrom = null, dateTo = null) {
    let query = `
      SELECT re.*, r.name as rule_name, r.category as rule_category
      FROM rule_evaluations re
      JOIN rules r ON re.rule_id = r.id
      WHERE re.student_id = $1
    `;
    const params = [studentId];

    if (dateFrom) {
      query += ` AND re.evaluated_at >= $2`;
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND re.evaluated_at <= $${params.length + 1}`;
      params.push(dateTo);
    }

    query += ' ORDER BY re.evaluated_at DESC';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async create(data) {
    const {
      institution_id,
      student_id,
      rule_id,
      enrollment_change_id,
      triggered,
      context_snapshot,
      evaluation_details,
      execution_time_ms
    } = data;

    const result = await db.query(
      `INSERT INTO rule_evaluations (
        institution_id, student_id, rule_id, enrollment_change_id,
        triggered, context_snapshot, evaluation_details, execution_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        institution_id, student_id, rule_id, enrollment_change_id,
        triggered, context_snapshot || {}, evaluation_details || {}, execution_time_ms
      ]
    );
    return result.rows[0];
  }
}

module.exports = RuleEvaluation;
