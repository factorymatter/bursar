const EnrollmentChangeRequest = require('../models/EnrollmentChangeRequest');
const EvaluationService = require('../services/EvaluationService');
const Warning = require('../models/Warning');
const { validationResult } = require('express-validator');

exports.getAllChangeRequests = async (req, res, next) => {
  try {
    const { institution_id, student_id, status, change_type, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT ecr.*, s.first_name as student_first_name, s.last_name as student_last_name
      FROM enrollment_change_requests ecr
      JOIN students s ON ecr.student_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (institution_id) {
      query += ` AND ecr.institution_id = $${paramCount}`;
      params.push(institution_id);
      paramCount++;
    }

    if (student_id) {
      query += ` AND ecr.student_id = $${paramCount}`;
      params.push(student_id);
      paramCount++;
    }

    if (status) {
      query += ` AND ecr.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (change_type) {
      query += ` AND ecr.change_type = $${paramCount}`;
      params.push(change_type);
      paramCount++;
    }

    query += ` ORDER BY ecr.requested_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await EnrollmentChangeRequest.db.query(query, params);

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

exports.getChangeRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const changeRequest = await EnrollmentChangeRequest.findById(id);

    if (!changeRequest) {
      return res.status(404).json({
        success: false,
        error: 'Change request not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: changeRequest
    });
  } catch (error) {
    next(error);
  }
};

exports.createChangeRequest = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    // Pre-fetch student and enrollment data to enrich context
    const Student = require('../models/Student');
    const Enrollment = require('../models/Enrollment');

    const student = await Student.findById(req.body.student_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
        code: 'STUDENT_NOT_FOUND'
      });
    }

    // Get current enrollments for the term
    const currentEnrollments = await Enrollment.getEnrollmentsForWarningEval(
      req.body.student_id,
      req.body.term_id
    );

    // Get financial aid package
    const FinancialAid = require('../models/FinancialAidPackage');
    const financialAid = await FinancialAid.findActiveByStudent(req.body.student_id);

    const changeRequest = await EnrollmentChangeRequest.create({
      ...req.body,
      student_enrollment_status: student.enrollment_status,
      student_sap_status: student.sap_status,
      student_metadata: student.metadata || {},
      current_enrollments,
      financial_aid: financialAid || null
    });

    // Immediately trigger evaluation for this change (synchronous for now, could be async)
    const evalService = new EvaluationService();
    const evaluationResult = await evalService.evaluateEnrollmentChange(changeRequest.id);

    await require('../models/AuditLog').create({
      institution_id: changeRequest.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'create_enrollment_change',
      resource_type: 'enrollment_change_request',
      resource_id: changeRequest.id,
      after_state: changeRequest,
      metadata: {
        evaluation_id: evaluationResult.evaluation_id,
        warnings_count: evaluationResult.warnings.length
      }
    });

    res.status(201).json({
      success: true,
      data: changeRequest,
      evaluation: evaluationResult
    });
  } catch (error) {
    next(error);
  }
};

exports.updateChangeRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, outcome_status, financial_impact } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const existing = await EnrollmentChangeRequest.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Change request not found',
        code: 'NOT_FOUND'
      });
    }

    const changeRequest = await EnrollmentChangeRequest.updateStatus(
      id,
      status,
      outcome_status,
      financial_impact
    );

    await require('../models/AuditLog').create({
      institution_id: changeRequest.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'update_status',
      resource_type: 'enrollment_change_request',
      resource_id: changeRequest.id,
      before_state: existing,
      after_state: changeRequest
    });

    res.json({
      success: true,
      data: changeRequest
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentChangeRequests = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const { status } = req.query;

    const requests = await EnrollmentChangeRequest.findByStudent(student_id, status);

    res.json({
      success: true,
      data: requests,
      meta: { count: requests.length }
    });
  } catch (error) {
    next(error);
  }
};

exports.getPendingRequests = async (req, res, next) => {
  try {
    const { institution_id } = req.params;

    const pending = await EnrollmentChangeRequest.getPendingRequests(institution_id);

    res.json({
      success: true,
      data: pending,
      meta: { count: pending.length }
    });
  } catch (error) {
    next(error);
  }
};
