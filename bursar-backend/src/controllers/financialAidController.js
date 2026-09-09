const FinancialAidPackage = require('../models/FinancialAidPackage');
const Student = require('../models/Student');
const { validationResult } = require('express-validator');

exports.getAllFinancialAidPackages = async (req, res, next) => {
  try {
    const { institution_id, student_id, academic_year, term_type, page = 1, limit = 20 } = req.query;

    let query = 'SELECT f.* FROM financial_aid_packages f WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (institution_id) {
      query += ` AND f.institution_id = $${paramCount}`;
      params.push(institution_id);
      paramCount++;
    }

    if (student_id) {
      query += ` AND f.student_id = $${paramCount}`;
      params.push(student_id);
      paramCount++;
    }

    if (academic_year) {
      query += ` AND f.academic_year = $${paramCount}`;
      params.push(academic_year);
      paramCount++;
    }

    if (term_type) {
      query += ` AND f.term_type = $${paramCount}`;
      params.push(term_type);
      paramCount++;
    }

    query += ` ORDER BY f.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await FinancialAidPackage.db.query(query, params);

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

exports.getFinancialAidPackage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const package = await FinancialAidPackage.findById(id);

    if (!package) {
      return res.status(404).json({
        success: false,
        error: 'Financial aid package not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: package
    });
  } catch (error) {
    next(error);
  }
};

exports.createFinancialAidPackage = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const financialAid = await FinancialAidPackage.create(req.body);

    await require('../models/AuditLog').create({
      institution_id: financialAid.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'create',
      resource_type: 'financial_aid_package',
      resource_id: financialAid.id,
      after_state: financialAid
    });

    res.status(201).json({
      success: true,
      data: financialAid
    });
  } catch (error) {
    next(error);
  }
};

exports.updateFinancialAidPackage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await FinancialAidPackage.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Financial aid package not found',
        code: 'NOT_FOUND'
      });
    }

    const financialAid = await FinancialAidPackage.update(id, req.body);

    await require('../models/AuditLog').create({
      institution_id: financialAid.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'update',
      resource_type: 'financial_aid_package',
      resource_id: financialAid.id,
      before_state: existing,
      after_state: financialAid
    });

    res.json({
      success: true,
      data: financialAid
    });
  } catch (error) {
    next(error);
  }
};

exports.getActiveAidByStudent = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const aid = await FinancialAidPackage.findActiveByStudent(student_id);

    if (!aid) {
      return res.status(404).json({
        success: false,
        error: 'No active aid package found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: aid
    });
  } catch (error) {
    next(error);
  }
};

exports.calculateImpact = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const { term_id, new_credits } = req.query;

    if (!term_id || !new_credits) {
      return res.status(400).json({
        success: false,
        error: 'term_id and new_credits are required',
        code: 'MISSING_PARAMETER'
      });
    }

    const impact = await FinancialAidPackage.calculateImpact(student_id, term_id, parseInt(new_credits));

    res.json({
      success: true,
      data: impact
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentAidSummary = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const { academic_year } = req.query;

    const aid = await Student.getFinancialAid(student_id, academic_year);

    const summary = {
      total_packages: aid.length,
      total_aid_received: aid.reduce((sum, pkg) => sum + (pkg.total_aid || 0), 0),
      current_aid: aid[0] || null,
      history: aid
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};
