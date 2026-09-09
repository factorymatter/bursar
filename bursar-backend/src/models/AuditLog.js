const db = require('../config/database');

class AuditLog {
  static async create(data) {
    const {
      institution_id,
      actor_type,
      actor_id,
      action,
      resource_type,
      resource_id,
      before_state,
      after_state,
      ip_address,
      user_agent,
      metadata
    } = data;

    const result = await db.query(
      `INSERT INTO audit_logs (
        institution_id, actor_type, actor_id, action,
        resource_type, resource_id, before_state, after_state,
        ip_address, user_agent, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        institution_id, actor_type, actor_id, action,
        resource_type, resource_id,
        before_state || null, after_state || null,
        ip_address, user_agent, metadata || {}
      ]
    );
    return result.rows[0];
  }

  static async findByInstitution(institutionId, filters = {}, limit = 100) {
    let query = 'SELECT * FROM audit_logs WHERE institution_id = $1';
    const params = [institutionId];

    if (filters.actor_type) {
      query += ` AND actor_type = $${params.length + 1}`;
      params.push(filters.actor_type);
    }

    if (filters.action) {
      query += ` AND action = $${params.length + 1}`;
      params.push(filters.action);
    }

    if (filters.resource_type) {
      query += ` AND resource_type = $${params.length + 1}`;
      params.push(filters.resource_type);
    }

    if (filters.date_from) {
      query += ` AND created_at >= $${params.length + 1}`;
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      query += ` AND created_at <= $${params.length + 1}`;
      params.push(filters.date_to);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await db.query(query, params);
    return result.rows;
  }

  static async findByResource(resourceType, resourceId, limit = 50) {
    const result = await db.query(
      'SELECT * FROM audit_logs WHERE resource_type = $1 AND resource_id = $2 ORDER BY created_at DESC LIMIT $3',
      [resourceType, resourceId, limit]
    );
    return result.rows;
  }

  static async getComplianceReport(institutionId, dateFrom, dateTo) {
    const result = await db.query(`
      SELECT
        COUNT(*) as total_events,
        COUNT(DISTINCT actor_id) as unique_users,
        COUNT(*) FILTER (WHERE action = 'create') as creates,
        COUNT(*) FILTER (WHERE action = 'update') as updates,
        COUNT(*) FILTER (WHERE action = 'delete') as deletes,
        COUNT(*) FILTER (WHERE action = 'login') as logins,
        COUNT(*) FILTER (WHERE action = 'rule_evaluation') as rule_evaluations
      FROM audit_logs
      WHERE institution_id = $1 AND created_at BETWEEN $2 AND $3
    `, [institutionId, dateFrom, dateTo]);
    return result.rows[0];
  }
}

module.exports = AuditLog;
