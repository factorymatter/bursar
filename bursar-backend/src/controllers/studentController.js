const Student = require('../models/Student');
const Enrollment = require('../models/Enrollment');
const Warning = require('../models/Warning');
const FinancialAidPackage = require('../models/FinancialAidPackage');
const { validationResult } = require('express-validator');

exports.getAllStudents = async (req, res, next) => {
  try {
    const { institution_id, sap_status, search, page = 1, limit = 20 } = req.query;

    const filters = {};
    if (institution_id) filters.institution_id = institution_id;
    if (sap_status) filters.sap_status = sap_status;
    if (search) filters.search = search;

    const students = await Student.findAll(filters);

    res.json({
      success: true,
      data: students,
      meta: {
        count: students.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    next(error);
  }
};

exports.createStudent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const student = await Student.create(req.body);

    await require('../models/AuditLog').create({
      institution_id: student.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'create',
      resource_type: 'student',
      resource_id: student.id,
      after_state: student
    });

    res.status(201).json({
      success: true,
      data: student
    });
  } catch (error) {
    next(error);
  }
};

exports.updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await Student.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
        code: 'NOT_FOUND'
      });
    }

    const student = await Student.update(id, req.body);

    await require('../models/AuditLog').create({
      institution_id: student.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'update',
      resource_type: 'student',
      resource_id: student.id,
      before_state: existing,
      after_state: student
    });

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentEnrollments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { term_id } = req.query;

    const enrollments = await Student.getEnrollments(id, term_id);

    res.json({
      success: true,
      data: enrollments,
      meta: { count: enrollments.length }
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentFinancialAid = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { academic_year } = req.query;

    const aid = await Student.getFinancialAid(id, academic_year);

    res.json({
      success: true,
      data: aid,
      meta: { count: aid.length }
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentWarnings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    const warnings = await Warning.findByStudent(id, status);

    res.json({
      success: true,
      data: warnings,
      meta: { count: warnings.length }
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentTotalCredits = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { term_id } = req.query;

    if (!term_id) {
      return res.status(400).json({
        success: false,
        error: 'term_id is required',
        code: 'MISSING_PARAMETER'
      });
    }

    const total = await Student.getTotalCredits(id, term_id);

    res.json({
      success: true,
      data: { total_credits: total }
    });
  } catch (error) {
    next(error);
  }
};
