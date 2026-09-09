const AnalyticsDailySummary = require('../models/AnalyticsDailySummary');
const Warning = require('../models/Warning');
const SAPAppeal = require('../models/SAPAppeal');
const AuditLog = require('../models/AuditLog');
const { validationResult } = require('express-validator');
const db = require('../config/database');

exports.getDashboardSummary = async (req, res, next) => {
  try {
    const { institution_id } = req.params;
    let { date_from, date_to } = req.query;

    if (!date_from || !date_to) {
      // Default to last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      date_from = startDate.toISOString();
      date_to = endDate.toISOString();
    }

    // Fetch various metrics
    const [warningsStats, appealStats, auditStats, appointmentStats] = await Promise.all([
      Warning.getStatsByInstitution(institution_id, date_from, date_to),
      SAPAppeal.getStatsByInstitution(institution_id, date_from, date_to),
      AuditLog.getComplianceReport(institution_id, date_from, date_to),
      db.query(`
        SELECT
          COUNT(*) as total_appointments,
          COUNT(*) FILTER (WHERE status IN ('scheduled', 'confirmed')) as upcoming,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status IN ('cancelled', 'no_show')) as missed,
          COUNT(DISTINCT advisor_id) as advisors_involved,
          COUNT(DISTINCT student_id) as students_served
        FROM appointments
        WHERE institution_id = $1
          AND scheduled_at >= $2
          AND scheduled_at <= $3
      `, [institution_id, date_from, date_to])
    ]);

    const result = {
      warnings: warningsStats,
      appointments: appointmentStats.rows[0],
      sap_appeals: appealStats,
      audit: auditStats
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

exports.getDailyAnalytics = async (req, res, next) => {
  try {
    const { institution_id } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date are required',
        code: 'MISSING_PARAMETER'
      });
    }

    const summaries = await AnalyticsDailySummary.findByDateRange(institution_id, start_date, end_date);

    res.json({
      success: true,
      data: summaries,
      meta: { count: summaries.length }
    });
  } catch (error) {
    next(error);
  }
};

exports.regenerateDailyReport = async (req, res, next) => {
  try {
    const { institution_id } = req.params;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'date is required',
        code: 'MISSING_PARAMETER'
      });
    }

    const report = await AnalyticsDailySummary.generateDailyReport(institution_id, date);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

exports.getWarningTrends = async (req, res, next) => {
  try {
    const { institution_id } = req.params;
    const { start_date, end_date, severity } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date are required',
        code: 'MISSING_PARAMETER'
      });
    }

    let query = `
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM warnings
      WHERE institution_id = $1
        AND DATE(created_at) BETWEEN $2 AND $3
    `;
    const params = [institution_id, start_date, end_date];

    if (severity) {
      query += ` AND severity = $${params.length + 1}`;
      params.push(severity);
    }

    query += ' GROUP BY DATE(created_at) ORDER BY date';

    const result = await Warning.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

exports.getTopRulesTriggered = async (req, res, next) => {
  try {
    const { institution_id } = req.params;
    const { start_date, end_date, limit = 10 } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date are required',
        code: 'MISSING_PARAMETER'
      });
    }

    const result = await require('../models/RuleEvaluation').db.query(`
      SELECT r.name, r.category, COUNT(*) as trigger_count
      FROM rule_evaluations re
      JOIN rules r ON re.rule_id = r.id
      WHERE re.institution_id = $1
        AND DATE(re.created_at) BETWEEN $2 AND $3
        AND re.triggered = true
      GROUP BY r.id, r.name, r.category
      ORDER BY trigger_count DESC
      LIMIT $4
    `, [institution_id, start_date, end_date, parseInt(limit)]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

exports.getFinancialImpactByAidType = async (req, res, next) => {
  try {
    const { institution_id } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date are required',
        code: 'MISSING_PARAMETER'
      });
    }

    const result = await Warning.db.query(`
      SELECT
        jsonb_array_elements_text(aid_types_affected) as aid_type,
        COUNT(*) as warning_count,
        COALESCE(SUM(financial_impact), 0) as total_impact
      FROM warnings
      WHERE institution_id = $1
        AND DATE(created_at) BETWEEN $2 AND $3
      GROUP BY aid_type
      ORDER BY total_impact DESC
    `, [institution_id, start_date, end_date]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

exports.getAdvisorPerformance = async (req, res, next) => {
  try {
    const { institution_id } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date are required',
        code: 'MISSING_PARAMETER'
      });
    }

    const result = await db.query(`
      SELECT
        a.id as advisor_id,
        a.first_name,
        a.last_name,
        a.email,
        COUNT(DISTINCT w.id) as warnings_assigned,
        COUNT(DISTINCT w.id) FILTER (WHERE w.status = 'resolved') as warnings_resolved,
        COUNT(DISTINCT appt.id) as appointments_completed
      FROM advisors a
      LEFT JOIN warnings w ON a.id = w.advisor_id
        AND DATE(w.created_at) BETWEEN $1 AND $2
      LEFT JOIN appointments appt ON a.id = appt.advisor_id
        AND DATE(appt.scheduled_at) BETWEEN $1 AND $2
        AND appt.status = 'completed'
      WHERE a.institution_id = $3
      GROUP BY a.id, a.first_name, a.last_name, a.email
      ORDER BY warnings_resolved DESC
    `, [start_date, end_date, institution_id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

exports.getComplianceMetrics = async (req, res, next) => {
  try {
    const { institution_id } = req.params;
    const { date_from, date_to } = req.query;

    const report = await AuditLog.getComplianceReport(institution_id, date_from, date_to);

    // Additional compliance metrics
    const warningStats = await Warning.getStatsByInstitution(institution_id, date_from, date_to);
    const appealStats = await SAPAppeal.getStatsByInstitution(institution_id, date_from, date_to);

    res.json({
      success: true,
      data: {
        ...report,
        warnings: warningStats,
        sap_appeals: appealStats
      }
    });
  } catch (error) {
    next(error);
  }
};
