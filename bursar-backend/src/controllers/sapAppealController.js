const SAPAppeal = require('../models/SAPAppeal');
const { validationResult } = require('express-validator');

exports.getAllAppeals = async (req, res, next) => {
  try {
    const { institution_id, student_id, status, appeal_type, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT a.*, s.first_name, s.last_name, s.email as student_email
      FROM sap_appeals a
      JOIN students s ON a.student_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (institution_id) {
      query += ` AND a.institution_id = $${paramCount}`;
      params.push(institution_id);
      paramCount++;
    }

    if (student_id) {
      query += ` AND a.student_id = $${paramCount}`;
      params.push(student_id);
      paramCount++;
    }

    if (status) {
      query += ` AND a.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (appeal_type) {
      query += ` AND a.appeal_type = $${paramCount}`;
      params.push(appeal_type);
      paramCount++;
    }

    query += ` ORDER BY a.submitted_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await SAPAppeal.db.query(query, params);

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

exports.getAppeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appeal = await SAPAppeal.findById(id);

    if (!appeal) {
      return res.status(404).json({
        success: false,
        error: 'SAP appeal not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: appeal
    });
  } catch (error) {
    next(error);
  }
};

exports.createAppeal = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const appeal = await SAPAppeal.create({
      ...req.body,
      submitted_by: req.user.id
    });

    await require('../models/AuditLog').create({
      institution_id: appeal.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'submit_sap_appeal',
      resource_type: 'sap_appeal',
      resource_id: appeal.id,
      after_state: appeal
    });

    res.status(201).json({
      success: true,
      data: appeal
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAppealStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, decision_notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status is required',
        code: 'MISSING_PARAMETER'
      });
    }

    const existing = await SAPAppeal.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'SAP appeal not found',
        code: 'NOT_FOUND'
      });
    }

    const appeal = await SAPAppeal.updateStatus(
      id,
      status,
      req.user.id,
      decision_notes
    );

    // If approved or denied, update student's SAP status
    if (status === 'approved' || status === 'denied') {
      const newSapStatus = status === 'approved' ? 'eligible' : 'suspended';
      const sapEffectiveDate = new Date();

      await SAPAppeal.updateSAPStatus(
        existing.student_id,
        newSapStatus,
        sapEffectiveDate,
        id
      );
    }

    await require('../models/AuditLog').create({
      institution_id: appeal.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'decide_sap_appeal',
      resource_type: 'sap_appeal',
      resource_id: appeal.id,
      before_state: existing,
      after_state: appeal
    });

    res.json({
      success: true,
      data: appeal
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentAppeals = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const { status } = req.query;

    const appeals = await SAPAppeal.findByStudent(student_id, status);

    res.json({
      success: true,
      data: appeals,
      meta: { count: appeals.length }
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

    const stats = await SAPAppeal.getStatsByInstitution(institution_id, date_from, date_to);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};
