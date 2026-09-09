const db = require('../config/database');

class AnalyticsDailySummary {
  static async findByDate(institutionId, date) {
    const result = await db.query(
      'SELECT * FROM analytics_daily_summaries WHERE institution_id = $1 AND summary_date = $2',
      [institutionId, date]
    );
    return result.rows[0];
  }

  static async findByDateRange(institutionId, startDate, endDate) {
    const result = await db.query(`
      SELECT * FROM analytics_daily_summaries
      WHERE institution_id = $1 AND summary_date BETWEEN $2 AND $3
      ORDER BY summary_date
    `, [institutionId, startDate, endDate]);
    return result.rows;
  }

  static async create(data) {
    const {
      institution_id,
      summary_date,
      total_warnings_issued,
      total_financial_impact,
      warnings_by_severity,
      top_rules_triggered,
      students_affected,
      advisor_activity,
      sis_sync_status,
      conversion_metrics,
      compliance_metrics,
      denormalized_data
    } = data;

    const result = await db.query(
      `INSERT INTO analytics_daily_summaries (
        institution_id, summary_date, total_warnings_issued,
        total_financial_impact, warnings_by_severity, top_rules_triggered,
        students_affected, advisor_activity, sis_sync_status,
        conversion_metrics, compliance_metrics, denormalized_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        institution_id, summary_date, total_warnings_issued,
        total_financial_impact, warnings_by_severity, top_rules_triggered,
        students_affected, advisor_activity, sis_sync_status,
        conversion_metrics, compliance_metrics, denormalized_data || {}
      ]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    const allowedFields = [
      'total_warnings_issued', 'total_financial_impact', 'warnings_by_severity',
      'top_rules_triggered', 'students_affected', 'advisor_activity',
      'sis_sync_status', 'conversion_metrics', 'compliance_metrics',
      'denormalized_data'
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
    const query = `UPDATE analytics_daily_summaries SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async getTrendData(institutionId, startDate, endDate, metric) {
    const result = await db.query(`
      SELECT summary_date, ${metric}
      FROM analytics_daily_summaries
      WHERE institution_id = $1 AND summary_date BETWEEN $2 AND $3
      ORDER BY summary_date
    `, [institutionId, startDate, endDate]);
    return result.rows;
  }

  static async generateDailyReport(institutionId, date) {
    // This aggregates data from warnings, audit logs, and other sources
    const warnings = await db.query(`
      SELECT COUNT(*) as total_warnings_issued,
             COALESCE(SUM(financial_impact), 0) as total_financial_impact,
             jsonb_object_agg(severity, count) as warnings_by_severity
      FROM (
        SELECT severity, COUNT(*) as count
        FROM warnings
        WHERE institution_id = $1 AND DATE(created_at) = $2
        GROUP BY severity
      ) as severity_counts
    `, [institutionId, date]);

    // Get top rules triggered
    const topRules = await db.query(`
      SELECT r.name, COUNT(*) as count
      FROM rule_evaluations re
      JOIN rules r ON re.rule_id = r.id
      WHERE re.institution_id = $1 AND DATE(re.created_at) = $2
      GROUP BY r.name
      ORDER BY count DESC
      LIMIT 10
    `, [institutionId, date]);

    // Students affected
    const studentsAffected = await db.query(`
      SELECT COUNT(DISTINCT student_id) as count
      FROM warnings
      WHERE institution_id = $1 AND DATE(created_at) = $2
    `, [institutionId, date]);

    // Check if existing summary exists
    const existing = await this.findByDate(institutionId, date);

    const summary = {
      institution_id: institutionId,
      summary_date: date,
      total_warnings_issued: warnings.rows[0]?.total_warnings_issued || 0,
      total_financial_impact: warnings.rows[0]?.total_financial_impact || 0,
      warnings_by_severity: warnings.rows[0]?.warnings_by_severity || {},
      top_rules_triggered: topRules.rows,
      students_affected: studentsAffected.rows[0]?.count || 0,
      advisor_activity: {}, // To be filled from audit_logs
      sis_sync_status: { last_sync: null, status: 'unknown' }, // To be filled from sis_integrations
      conversion_metrics: {}, // To be filled
      compliance_metrics: {}, // To be filled
      denormalized_data: { generated_at: new Date() }
    };

    if (existing) {
      return await this.update(existing.id, summary);
    } else {
      return await this.create(summary);
    }
  }
}

module.exports = AnalyticsDailySummary;
