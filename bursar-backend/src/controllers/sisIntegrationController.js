const SISIntegration = require('../models/SISIntegration');
const { validationResult } = require('express-validator');

exports.getAllIntegrations = async (req, res, next) => {
  try {
    const { institution_id, vendor_name } = req.query;

    const integrations = await SISIntegration.findByInstitution(institution_id);

    res.json({
      success: true,
      data: integrations,
      meta: { count: integrations.length }
    });
  } catch (error) {
    next(error);
  }
};

exports.getIntegration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const integration = await SISIntegration.findById(id);

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integration not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: integration
    });
  } catch (error) {
    next(error);
  }
};

exports.createIntegration = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const integration = await SISIntegration.create(req.body);

    await require('../models/AuditLog').create({
      institution_id: integration.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'create',
      resource_type: 'sis_integration',
      resource_id: integration.id,
      after_state: integration
    });

    res.status(201).json({
      success: true,
      data: integration
    });
  } catch (error) {
    next(error);
  }
};

exports.updateIntegration = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await SISIntegration.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Integration not found',
        code: 'NOT_FOUND'
      });
    }

    const integration = await SISIntegration.update(id, req.body);

    await require('../models/AuditLog').create({
      institution_id: integration.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'update',
      resource_type: 'sis_integration',
      resource_id: integration.id,
      before_state: existing,
      after_state: integration
    });

    res.json({
      success: true,
      data: integration
    });
  } catch (error) {
    next(error);
  }
};

exports.handleWebhook = async (req, res, next) => {
  try {
    const { institution_id } = req.params;
    const { event_type, payload, timestamp, signature } = req.body;

    // Verify signature
    const integration = await SISIntegration.findByInstitution(institution_id);
    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integration not configured',
        code: 'INTEGRATION_NOT_FOUND'
      });
    }

    const isValid = await SISIntegration.verifyWebhookSignature(
      integration.webhook_secret,
      payload,
      signature
    );

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature',
        code: 'INVALID_SIGNATURE'
      });
    }

    // Process webhook based on event type
    const result = await this.processWebhookEvent(institution_id, event_type, payload);

    // Update integration last sync
    await SISIntegration.updateLastSync(integration.id, true);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

exports.processWebhookEvent = async (institutionId, eventType, payload) => {
  switch (eventType) {
    case 'student_update':
      return await this.processStudentUpdate(institutionId, payload);
    case 'enrollment_change':
      return await this.processEnrollmentChange(institutionId, payload);
    case 'grade_posted':
      return await this.processGradePosted(institutionId, payload);
    case 'financial_aid_update':
      return await this.processFinancialAidUpdate(institutionId, payload);
    case 'term_created':
      return await this.processTermCreated(institutionId, payload);
    default:
      throw new Error(`Unknown webhook event type: ${eventType}`);
  }
};

exports.processStudentUpdate = async (institutionId, payload) => {
  const { sis_student_id, first_name, last_name, email, phone, program_id, metadata } = payload;

  const Student = require('../models/Student');
  const existing = await Student.findBySisId(institutionId, sis_student_id);

  if (existing) {
    const updated = await Student.update(existing.id, {
      first_name,
      last_name,
      email,
      phone,
      program_id,
      metadata: { ...existing.metadata, ...metadata },
      last_sync_at: new Date()
    });

    await require('../models/AuditLog').create({
      institution_id: institutionId,
      actor_type: 'system',
      actor_id: 'sis-sync',
      action: 'sync_student_update',
      resource_type: 'student',
      resource_id: existing.id,
      after_state: updated
    });

    return { action: 'updated', student_id: existing.id };
  } else {
    const created = await Student.create({
      institution_id: institutionId,
      sis_student_id,
      first_name,
      last_name,
      email,
      phone,
      program_id,
      metadata
    });

    await require('../models/AuditLog').create({
      institution_id: institutionId,
      actor_type: 'system',
      actor_id: 'sis-sync',
      action: 'sync_student_create',
      resource_type: 'student',
      resource_id: created.id,
      after_state: created
    });

    return { action: 'created', student_id: created.id };
  }
};

exports.processEnrollmentChange = async (institutionId, payload) => {
  const { student_sis_id, section_code, term_code, change_type, reason } = payload;

  const Student = require('../models/Student');
  const Section = require('../models/Section');
  const Enrollment = require('../models/Enrollment');
  const EnrollmentChangeRequest = require('../models/EnrollmentChangeRequest');
  const EvaluationService = require('../services/EvaluationService');

  const student = await Student.findBySisId(institutionId, student_sis_id);
  if (!student) {
    throw new Error(`Student ${student_sis_id} not found`);
  }

  const section = await Section.findByInstitutionAndTerm(institutionId, term_code).then(sections =>
    sections.find(s => s.section_number === section_code)
  );
  if (!section) {
    throw new Error(`Section ${section_code} not found for term ${term_code}`);
  }

  // Create enrollment change request
  const changeRequest = await EnrollmentChangeRequest.create({
    student_id: student.id,
    institution_id: institutionId,
    section_id: section.id,
    term_id: section.term_id,
    change_type,
    reason: reason || 'SIS automated sync',
    context_data: { source: 'sis_webhook', payload }
  });

  // Create or update enrollment
  if (change_type === 'add' || change_type === 'drop') {
    const Enrollment = require('../models/Enrollment');
    if (change_type === 'add') {
      const credits = section.course_credits || 3;
      await Enrollment.create({
        student_id: student.id,
        section_id: section.id,
        institution_id: institutionId,
        term_id: section.term_id,
        status: 'enrolled',
        credits_attempted: credits
      });
    } else if (change_type === 'drop') {
      await Enrollment.dropEnrollment(student.id, section.id);
    }
  }

  // Trigger evaluation asynchronously
  const evalService = new EvaluationService();
  evalService.evaluateEnrollmentChange(changeRequest.id).catch(console.error);

  await require('../models/AuditLog').create({
    institution_id: institutionId,
    actor_type: 'system',
    actor_id: 'sis-webhook',
    action: `sync_${change_type}`,
    resource_type: 'enrollment_change_request',
    resource_id: changeRequest.id,
    metadata: { student_sis_id, section_code, term_code }
  });

  return { action: 'enrollment_change_created', request_id: changeRequest.id };
};

exports.processGradePosted = async (institutionId, payload) => {
  const { student_sis_id, section_code, term_code, grade } = payload;

  const Student = require('../models/Student');
  const Enrollment = require('../models/Enrollment');

  const student = await Student.findBySisId(institutionId, student_sis_id);
  if (!student) {
    throw new Error(`Student ${student_sis_id} not found`);
  }

  // Find enrollment
  const enrollments = await Enrollment.db.query(`
    SELECT e.id, e.section_id, sec.section_number, sec.term_id
    FROM enrollments e
    JOIN sections sec ON e.section_id = sec.id
    WHERE e.student_id = $1 AND sec.term_id = (SELECT id FROM academic_terms WHERE code = $2)
  `, [student.id, term_code]);

  const enrollment = enrollments.rows.find(e => e.section_number === section_code);
  if (!enrollment) {
    throw new Error(`Enrollment not found for student ${student_sis_id}, section ${section_code}, term ${term_code}`);
  }

  const updated = await Enrollment.updateStatus(enrollment.id, 'completed', 'graded');
  updated.grade = grade;
  updated = await Enrollment.db.query(
    'UPDATE enrollments SET grade = $1 WHERE id = $2 RETURNING *',
    [grade, enrollment.id]
  ).then(r => r.rows[0]);

  await require('../models/AuditLog').create({
    institution_id: institutionId,
    actor_type: 'system',
    actor_id: 'sis-sync',
    action: 'sync_grade_posted',
    resource_type: 'enrollment',
    resource_id: enrollment.id,
    after_state: updated
  });

  return { action: 'grade_updated', enrollment_id: enrollment.id };
};

exports.processFinancialAidUpdate = async (institutionId, payload) => {
  const FinancialAid = require('../models/FinancialAidPackage');
  const { student_sis_id, academic_year, term_type, aid_data } = payload;

  const Student = require('../models/Student');
  const student = await Student.findBySisId(institutionId, student_sis_id);
  if (!student) {
    throw new Error(`Student ${student_sis_id} not found`);
  }

  const existing = await FinancialAid.findByStudentAndYear(student.id, academic_year, term_type);

  const packageData = {
    student_id: student.id,
    institution_id: institutionId,
    academic_year,
    term_type,
    ...aid_data
  };

  let financialAid;
  if (existing) {
    financialAid = await FinancialAid.update(existing.id, packageData);
  } else {
    financialAid = await FinancialAid.create(packageData);
  }

  await require('../models/AuditLog').create({
    institution_id: institutionId,
    actor_type: 'system',
    actor_id: 'sis-sync',
    action: existing ? 'sync_financial_aid_update' : 'sync_financial_aid_create',
    resource_type: 'financial_aid_package',
    resource_id: financialAid.id,
    after_state: financialAid
  });

  return { action: existing ? 'updated' : 'created', package_id: financialAid.id };
};

processTermCreated = async (institutionId, payload) => {
  const AcademicTerm = require('../models/AcademicTerm');
  const { code, name, academic_year, term_type, start_date, end_date, add_drop_deadline, withdrawal_deadline } = payload;

  const existing = await AcademicTerm.findByCode(institutionId, code);

  if (existing) {
    const updated = await AcademicTerm.update(existing.id, {
      name, start_date, end_date, add_drop_deadline, withdrawal_deadline
    });
    return { action: 'updated', term_id: existing.id };
  } else {
    const created = await AcademicTerm.create({
      institution_id: institutionId,
      code,
      name,
      academic_year,
      term_type,
      start_date,
      end_date,
      add_drop_deadline,
      withdrawal_deadline
    });
    return { action: 'created', term_id: created.id };
  }
};
