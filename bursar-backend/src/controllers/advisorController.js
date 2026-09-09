const Advisor = require('../models/Advisor');
const AdvisorAssignment = require('../models/AdvisorAssignment');
const Appointment = require('../models/Appointment');
const Warning = require('../models/Warning');
const { validationResult } = require('express-validator');

exports.getAllAdvisors = async (req, res, next) => {
  try {
    const { institution_id, is_active, department } = req.query;

    const filters = {};
    if (institution_id) filters.institution_id = institution_id;
    if (is_active !== undefined) filters.is_active = is_active === 'true';
    if (department) filters.department = department;

    const advisors = await Advisor.findAllForInstitution(institution_id, filters);

    res.json({
      success: true,
      data: advisors,
      meta: { count: advisors.length }
    });
  } catch (error) {
    next(error);
  }
};

exports.getAdvisor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const advisor = await Advisor.findById(id);

    if (!advisor) {
      return res.status(404).json({
        success: false,
        error: 'Advisor not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: advisor
    });
  } catch (error) {
    next(error);
  }
};

exports.createAdvisor = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const advisor = await Advisor.create(req.body);

    await require('../models/AuditLog').create({
      institution_id: advisor.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'create',
      resource_type: 'advisor',
      resource_id: advisor.id,
      after_state: advisor
    });

    res.status(201).json({
      success: true,
      data: advisor
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAdvisor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await Advisor.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Advisor not found',
        code: 'NOT_FOUND'
      });
    }

    const advisor = await Advisor.update(id, req.body);

    await require('../models/AuditLog').create({
      institution_id: advisor.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'update',
      resource_type: 'advisor',
      resource_id: advisor.id,
      before_state: existing,
      after_state: advisor
    });

    res.json({
      success: true,
      data: advisor
    });
  } catch (error) {
    next(error);
  }
};

exports.getAdvisorAssignments = async (req, res, next) => {
  try {
    const { advisor_id } = req.params;
    const { status } = req.query;

    const assignments = await AdvisorAssignment.findByAdvisor(advisor_id, status);

    res.json({
      success: true,
      data: assignments,
      meta: { count: assignments.length }
    });
  } catch (error) {
    next(error);
  }
};

exports.assignStudentToAdvisor = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const assignment = await AdvisorAssignment.create({
      ...req.body,
      assigned_by: req.user.id
    });

    await require('../models/AuditLog').create({
      institution_id: assignment.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'assign_advisor',
      resource_type: 'advisor_assignment',
      resource_id: assignment.id,
      after_state: assignment
    });

    res.status(201).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentAssignedAdvisor = async (req, res, next) => {
  try {
    const { student_id } = req.params;

    const assignment = await AdvisorAssignment.findByStudent(student_id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'No advisor assigned to student',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    next(error);
  }
};

exports.getAdvisorAppointments = async (req, res, next) => {
  try {
    const { advisor_id } = req.params;
    const { status, date_from, date_to } = req.query;

    const appointments = await Appointment.findByAdvisor(advisor_id, status, date_from, date_to);

    res.json({
      success: true,
      data: appointments,
      meta: { count: appointments.length }
    });
  } catch (error) {
    next(error);
  }
};

exports.createAppointment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    // Check for conflicts
    const conflict = await Appointment.findConflicting(
      req.body.advisor_id,
      req.body.scheduled_at,
      req.body.duration
    );

    if (conflict) {
      return res.status(409).json({
        success: false,
        error: 'Time slot conflicts with existing appointment',
        code: 'APPOINTMENT_CONFLICT'
      });
    }

    const appointment = await Appointment.create({
      ...req.body,
      created_by: req.user.id
    });

    await require('../models/AuditLog').create({
      institution_id: appointment.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'create',
      resource_type: 'appointment',
      resource_id: appointment.id,
      after_state: appointment
    });

    // Notify advisor and student (async)
    // await NotificationService.createAppointmentNotifications(appointment);

    res.status(201).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const appointment = await Appointment.updateStatus(id, status, notes);

    await require('../models/AuditLog').create({
      institution_id: appointment.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'update_status',
      resource_type: 'appointment',
      resource_id: appointment.id,
      after_state: appointment
    });

    res.json({
      success: true,
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentUpcomingAppointments = async (req, res, next) => {
  try {
    const { student_id } = req.params;

    const appointments = await Appointment.getUpcomingForStudent(student_id);

    res.json({
      success: true,
      data: appointments,
      meta: { count: appointments.length }
    });
  } catch (error) {
    next(error);
  }
};
