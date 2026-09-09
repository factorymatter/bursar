const Warning = require('../models/Warning');
const { validationResult } = require('express-validator');

exports.getAllWarnings = async (req, res, next) => {
  try {
    const {
      institution_id,
      student_id,
      advisor_id,
      status,
      severity,
      date_from,
      date_to,
      page = 1,
      limit = 20
    } = req.query;

    let query = `
      SELECT w.*, s.first_name as student_first_name, s.last_name as student_last_name,
             a.first_name as advisor_first_name, a.last_name as advisor_last_name
      FROM warnings w
      JOIN students s ON w.student_id = s.id
      LEFT JOIN advisors a ON w.advisor_id = a.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (institution_id) {
      query += ` AND w.institution_id = $${paramCount}`;
      params.push(institution_id);
      paramCount++;
    }

    if (student_id) {
      query += ` AND w.student_id = $${paramCount}`;
      params.push(student_id);
      paramCount++;
    }

    if (advisor_id) {
      query += ` AND w.advisor_id = $${paramCount}`;
      params.push(advisor_id);
      paramCount++;
    }

    if (status) {
      query += ` AND w.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (severity) {
      query += ` AND w.severity = $${paramCount}`;
      params.push(severity);
      paramCount++;
    }

    if (date_from) {
      query += ` AND w.created_at >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      query += ` AND w.created_at <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    query += ` ORDER BY w.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await Warning.db.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      meta: {
        count: result.rows.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getWarning = async (req, res, next) => {
  try {
    const { id } = req.params;
    const warning = await Warning.findById(id);

    if (!warning) {
      return res.status(404).json({
        success: false,
        error: 'Warning not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: warning
    });
  } catch (error) {
    next(error);
  }
};

exports.updateWarningStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const existing = await Warning.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Warning not found',
        code: 'NOT_FOUND'
      });
    }

    const warning = await Warning.updateStatus(id, status);

    await require('../models/AuditLog').create({
      institution_id: warning.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'update_status',
      resource_type: 'warning',
      resource_id: warning.id,
      before_state: existing,
      after_state: warning
    });

    res.json({
      success: true,
      data: warning
    });
  } catch (error) {
    next(error);
  }
};

exports.assignAdvisor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { advisor_id } = req.body;

    if (!advisor_id) {
      return res.status(400).json({
        success: false,
        error: 'advisor_id is required',
        code: 'MISSING_PARAMETER'
      });
    }

    const existing = await Warning.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Warning not found',
        code: 'NOT_FOUND'
      });
    }

    const warning = await Warning.assignAdvisor(id, advisor_id);

    await require('../models/AuditLog').create({
      institution_id: warning.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'assign_advisor',
      resource_type: 'warning',
      resource_id: warning.id,
      before_state: existing,
      after_state: warning
    });

    res.json({
      success: true,
      data: warning
    });
  } catch (error) {
    next(error);
  }
};

exports.markShownToStudent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await Warning.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Warning not found',
        code: 'NOT_FOUND'
      });
    }

    const warning = await Warning.markShownToStudent(id);

    res.json({
      success: true,
      data: warning
    });
  } catch (error) {
    next(error);
  }
};

exports.getInstitutionStats = async (req, res, next) => {
  try {
    const { institution_id } = req.params;
    const { date_from, date_to } = req.query;

    if (!date_from || !date_to) {
      return res.status(400).json({
        success: false,
        error: 'date_from and date_to are required',
        code: 'MISSING_PARAMETER'
      });
    }

    const stats = await Warning.getStatsByInstitution(institution_id, date_from, date_to);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};
