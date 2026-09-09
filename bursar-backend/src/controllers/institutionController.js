const Institution = require('../models/Institution');
const { validationResult } = require('express-validator');

exports.getAllInstitutions = async (req, res, next) => {
  try {
    const { type } = req.query;
    const institutions = await Institution.findAll({ type });
    res.json({
      success: true,
      data: institutions,
      meta: { count: institutions.length }
    });
  } catch (error) {
    next(error);
  }
};

exports.getInstitution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const institution = await Institution.findById(id);

    if (!institution) {
      return res.status(404).json({
        success: false,
        error: 'Institution not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: institution
    });
  } catch (error) {
    next(error);
  }
};

exports.createInstitution = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const institution = await Institution.create(req.body);

    await require('../models/AuditLog').create({
      institution_id: institution.id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'create',
      resource_type: 'institution',
      resource_id: institution.id,
      after_state: institution
    });

    res.status(201).json({
      success: true,
      data: institution
    });
  } catch (error) {
    next(error);
  }
};

exports.updateInstitution = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await Institution.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Institution not found',
        code: 'NOT_FOUND'
      });
    }

    const institution = await Institution.update(id, req.body);

    await require('../models/AuditLog').create({
      institution_id: institution.id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'update',
      resource_type: 'institution',
      resource_id: institution.id,
      before_state: existing,
      after_state: institution
    });

    res.json({
      success: true,
      data: institution
    });
  } catch (error) {
    next(error);
  }
};

exports.deactivateInstitution = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await Institution.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Institution not found',
        code: 'NOT_FOUND'
      });
    }

    const institution = await Institution.deactivate(id);

    await require('../models/AuditLog').create({
      institution_id: institution.id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'deactivate',
      resource_type: 'institution',
      resource_id: institution.id,
      after_state: institution
    });

    res.json({
      success: true,
      data: institution
    });
  } catch (error) {
    next(error);
  }
};
