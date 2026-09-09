const Rule = require('../models/Rule');
const RulesEngine = require('../services/RulesEngine');
const { validationResult } = require('express-validator');

exports.getAllRules = async (req, res, next) => {
  try {
    const { institution_id, category, is_active, page = 1, limit = 20 } = req.query;

    const filters = {};
    if (institution_id) filters.institution_id = institution_id;
    if (category) filters.category = category;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const rules = await Rule.findAllForInstitution(institution_id, filters);

    res.json({
      success: true,
      data: rules,
      meta: { count: rules.length }
    });
  } catch (error) {
    next(error);
  }
};

exports.getRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rule = await Rule.findById(id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    next(error);
  }
};

exports.createRule = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const rule = await Rule.create(req.body);

    await require('../models/AuditLog').create({
      institution_id: rule.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'create',
      resource_type: 'rule',
      resource_id: rule.id,
      after_state: rule
    });

    res.status(201).json({
      success: true,
      data: rule
    });
  } catch (error) {
    next(error);
  }
};

exports.updateRule = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await Rule.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found',
        code: 'NOT_FOUND'
      });
    }

    const rule = await Rule.update(id, req.body);

    await require('../models/AuditLog').create({
      institution_id: rule.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'update',
      resource_type: 'rule',
      resource_id: rule.id,
      before_state: existing,
      after_state: rule
    });

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    next(error);
  }
};

exports.deactivateRule = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await Rule.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found',
        code: 'NOT_FOUND'
      });
    }

    const rule = await Rule.deactivate(id);

    await require('../models/AuditLog').create({
      institution_id: rule.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'deactivate',
      resource_type: 'rule',
      resource_id: rule.id,
      after_state: rule
    });

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    next(error);
  }
};

exports.testRule = async (req, res, next) => {
  try {
    const { rule_id } = req.params;
    const { student_id, simulated_change } = req.body;

    if (!student_id) {
      return res.status(400).json({
        success: false,
        error: 'student_id is required',
        code: 'MISSING_PARAMETER'
      });
    }

    const engine = new RulesEngine();
    const result = await engine.testRule(rule_id, student_id, simulated_change);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

exports.evaluateStudent = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const institutionId = req.params.institutionId || req.query.institution_id;

    if (!institutionId) {
      return res.status(400).json({
        success: false,
        error: 'institution_id is required',
        code: 'MISSING_PARAMETER'
      });
    }

    const engine = new RulesEngine();
    const result = await engine.evaluateRulesForStudent(student_id, institutionId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

exports.getRuleCategories = async (req, res, next) => {
  try {
    const { institution_id } = req.params;

    const result = await Rule.db.query(`
      SELECT DISTINCT category
      FROM rules
      WHERE institution_id = $1 AND is_active = true
      ORDER BY category
    `, [institutionId]);

    res.json({
      success: true,
      data: result.rows.map(row => row.category)
    });
  } catch (error) {
    next(error);
  }
};
