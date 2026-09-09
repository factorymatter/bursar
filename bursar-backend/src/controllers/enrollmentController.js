const Enrollment = require('../models/Enrollment');
const Student = require('../models/Student');
const Section = require('../models/Section');
const { validationResult } = require('express-validator');

exports.getAllEnrollments = async (req, res, next) => {
  try {
    const { institution_id, term_id, student_id, status, page = 1, limit = 20 } = req.query;

    let query = 'SELECT e.* FROM enrollments e WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (institution_id) {
      query += ` AND e.institution_id = $${paramCount}`;
      params.push(institution_id);
      paramCount++;
    }

    if (term_id) {
      query += ` AND e.term_id = $${paramCount}`;
      params.push(term_id);
      paramCount++;
    }

    if (student_id) {
      query += ` AND e.student_id = $${paramCount}`;
      params.push(student_id);
      paramCount++;
    }

    if (status) {
      query += ` AND e.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY e.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await Enrollment.db.query(query, params);

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

exports.getEnrollment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const enrollment = await Enrollment.findById(id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: 'Enrollment not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    next(error);
  }
};

exports.createEnrollment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const {
      student_id,
      section_id,
      institution_id,
      term_id
    } = req.body;

    // Check if section exists and has capacity
    const section = await Section.findById(section_id);
    if (!section) {
      return res.status(404).json({
        success: false,
        error: 'Section not found',
        code: 'SECTION_NOT_FOUND'
      });
    }

    const capacity = await Section.getAvailableCapacity(section_id);
    if (capacity.available_seats <= 0) {
      return res.status(409).json({
        success: false,
        error: 'Section is full',
        code: 'SECTION_FULL'
      });
    }

    // Check if student already enrolled
    const existing = await Enrollment.findByStudentAndSection(student_id, section_id);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Student already enrolled in this section',
        code: 'ALREADY_ENROLLED'
      });
    }

    // Get course credits for credits_attempted
    const credits = section.course_credits || 3;

    const enrollment = await Enrollment.create({
      ...req.body,
      credits_attempted: credits,
      status: 'enrolled'
    });

    // Log to audit
    await require('../models/AuditLog').create({
      institution_id: institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'enroll',
      resource_type: 'enrollment',
      resource_id: enrollment.id,
      after_state: enrollment
    });

    // Trigger evaluation pipeline for this enrollment change
    // This will be picked up by EnrollmentChangeRequest or we can trigger directly
    // For now, create an enrollment change request and evaluate
    const EnrollmentChangeRequest = require('../models/EnrollmentChangeRequest');
    const EvaluationService = require('../services/EvaluationService');

    const changeRequest = await EnrollmentChangeRequest.create({
      student_id,
      institution_id,
      section_id,
      term_id,
      change_type: 'add',
      reason: 'manual_enrollment',
      context_data: {
        enrolled_by: req.user.id,
        enrollment_id: enrollment.id
      }
    });

    // Kick off asynchronous evaluation
    const evalService = new EvaluationService();
    evalService.evaluateEnrollmentChange(changeRequest.id).catch(console.error);

    res.status(201).json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    next(error);
  }
};

exports.dropEnrollment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { outcome_status, reason } = req.body;

    // Fetch enrollment
    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: 'Enrollment not found',
        code: 'NOT_FOUND'
      });
    }

    if (enrollment.status === 'dropped') {
      return res.status(409).json({
        success: false,
        error: 'Enrollment already dropped',
        code: 'ALREADY_DROPPED'
      });
    }

    const updated = await Enrollment.dropEnrollment(
      enrollment.student_id,
      enrollment.section_id,
      outcome_status
    );

    // Log to audit
    await require('../models/AuditLog').create({
      institution_id: enrollment.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'drop',
      resource_type: 'enrollment',
      resource_id: enrollment.id,
      before_state: enrollment,
      after_state: updated,
      metadata: { reason }
    });

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

exports.updateEnrollmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, outcome_status } = req.body;

    // Fetch current
    const existing = await Enrollment.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Enrollment not found',
        code: 'NOT_FOUND'
      });
    }

    const enrollment = await Enrollment.updateStatus(id, status, outcome_status);

    await require('../models/AuditLog').create({
      institution_id: enrollment.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'update_status',
      resource_type: 'enrollment',
      resource_id: enrollment.id,
      before_state: existing,
      after_state: enrollment
    });

    res.json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    next(error);
  }
};

exports.getEnrollmentCapacity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const capacity = await Section.getAvailableCapacity(id);

    res.json({
      success: true,
      data: capacity
    });
  } catch (error) {
    next(error);
  }
};
