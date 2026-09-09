const Joi = require('joi');

const schemas = {
  // Student validation schemas
  student: {
    create: Joi.object({
      institution_id: Joi.string().uuid().required(),
      sis_student_id: Joi.string().required(),
      first_name: Joi.string().required(),
      last_name: Joi.string().required(),
      email: Joi.string().email().required(),
      phone: Joi.string().optional(),
      date_of_birth: Joi.date().optional(),
      program_id: Joi.string().optional(),
      expected_completion: Joi.date().optional(),
      enrollment_status: Joi.string().valid('active', 'inactive', 'graduated', 'withdrawn').default('active'),
      sap_status: Joi.string().valid('eligible', 'warning', 'probation', 'suspended').optional(),
      sap_effective_date: Joi.date().optional(),
      metadata: Joi.object().optional()
    }),

    update: Joi.object({
      first_name: Joi.string().optional(),
      last_name: Joi.string().optional(),
      email: Joi.string().email().optional(),
      phone: Joi.string().optional(),
      date_of_birth: Joi.date().optional(),
      program_id: Joi.string().optional(),
      expected_completion: Joi.date().optional(),
      sap_status: Joi.string().valid('eligible', 'warning', 'probation', 'suspended').optional(),
      sap_effective_date: Joi.date().optional(),
      enrollment_status: Joi.string().valid('active', 'inactive', 'graduated', 'withdrawn').optional(),
      metadata: Joi.object().optional()
    }).min(1)
  },

  // Enrollment validation schemas
  enrollment: {
    create: Joi.object({
      student_id: Joi.string().uuid().required(),
      section_id: Joi.string().uuid().required(),
      institution_id: Joi.string().uuid().required(),
      term_id: Joi.string().uuid().required(),
      status: Joi.string().valid('enrolled', 'dropped', 'waitlisted', 'completed').default('enrolled'),
      grade: Joi.string().valid('A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F', 'W', 'I', 'P', 'NP').optional(),
      credits_attempted: Joi.number().min(0).required(),
      credits_earned: Joi.number().min(0).optional(),
      is_repeat: Joi.boolean().default(false),
      financial_impact: Joi.number().optional(),
      metadata: Joi.object().optional()
    }),

    updateStatus: Joi.object({
      status: Joi.string().valid('enrolled', 'dropped', 'waitlisted', 'completed').required(),
      outcome_status: Joi.string().valid('dropped', 'withdrawn', 'failed', 'completed').optional()
    }).min(1)
  },

  // Rule validation schemas
  rule: {
    create: Joi.object({
      institution_id: Joi.string().uuid().required(),
      name: Joi.string().required(),
      code: Joi.string().required(),
      description: Joi.string().optional(),
      category: Joi.string().valid(
        'financial_aid',
        'academic_progress',
        'enrollment_limits',
        'sap',
        'disbursement',
        'refund',
        'custom'
      ).required(),
      severity: Joi.string().valid('critical', 'high', 'medium', 'low').required(),
      conditions: Joi.array().items(
        Joi.object({
          field: Joi.string().required(),
          operator: Joi.string().valid(
            'eq', 'neq', 'lt', 'lte', 'gt', 'gte',
            'in', 'not_in', 'contains', 'matches'
          ).required(),
          value: Joi.any().required()
        })
      ).required(),
      actions: Joi.array().items(
        Joi.object({
          type: Joi.string().valid(
            'create_warning',
            'notify_student',
            'notify_advisor',
            'block_enrollment',
            'require_approval',
            'calculate_impact',
            'trigger_sap_review'
          ).required(),
          config: Joi.object().optional()
        })
      ).required(),
      priority: Joi.number().integer().min(0).default(100),
      is_active: Joi.boolean().default(true),
      institution_specific: Joi.boolean().default(false)
    }),

    test: Joi.object({
      rule_id: Joi.string().uuid().required(),
      student_id: Joi.string().uuid().required(),
      simulated_change: Joi.object().optional()
    }).min(1)
  },

  // Warning validation schemas
  warning: {
    updateStatus: Joi.object({
      status: Joi.string().valid('active', 'acknowledged', 'resolved', 'dismissed').required()
    }).min(1)
  },

  // Advisor validation schemas
  advisor: {
    create: Joi.object({
      institution_id: Joi.string().uuid().required(),
      first_name: Joi.string().required(),
      last_name: Joi.string().required(),
      email: Joi.string().email().required(),
      phone: Joi.string().optional(),
      title: Joi.string().optional(),
      department: Joi.string().optional(),
      timezone: Joi.string().optional(),
      settings: Joi.object().optional(),
      is_active: Joi.boolean().default(true)
    }),

    update: Joi.object({
      first_name: Joi.string().optional(),
      last_name: Joi.string().optional(),
      email: Joi.string().email().optional(),
      phone: Joi.string().optional(),
      title: Joi.string().optional(),
      department: Joi.string().optional(),
      timezone: Joi.string().optional(),
      settings: Joi.object().optional(),
      is_active: Joi.boolean().optional()
    }).min(1)
  },

  // Appointment validation schemas
  appointment: {
    create: Joi.object({
      student_id: Joi.string().uuid().required(),
      advisor_id: Joi.string().uuid().required(),
      institution_id: Joi.string().uuid().required(),
      warning_id: Joi.string().uuid().optional(),
      scheduled_at: Joi.date().required(),
      duration: Joi.number().integer().min(15).max(180).default(30),
      location: Joi.string().optional(),
      meeting_type: Joi.string().valid('in_person', 'virtual', 'phone').default('virtual'),
      notes: Joi.string().optional(),
      created_by: Joi.string().uuid().optional()
    }),

    updateStatus: Joi.object({
      status: Joi.string().valid('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show').required(),
      notes: Joi.string().optional()
    }).min(1)
  },

  // SIS Integration webhook validation
  sisWebhook: Joi.object({
    event_type: Joi.string().required(),
    payload: Joi.object().required(),
    timestamp: Joi.date().required(),
    signature: Joi.string().required()
  }),

  // Enrollment change request validation
  enrollmentChangeRequest: Joi.object({
    student_id: Joi.string().uuid().required(),
    section_id: Joi.string().uuid().required(),
    term_id: Joi.string().uuid().required(),
    change_type: Joi.string().valid('add', 'drop', 'section_change').required(),
    reason: Joi.string().required(),
    context_data: Joi.object().optional()
  }).min(1)
};

const validateRequest = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      throw new Error(`Schema '${schemaName}' not found`);
    }

    let validationSchema;

    if (typeof schema === 'object' && !schema.validate) {
      // Multiple schemas (create, update, etc.)
      const method = req.method.toLowerCase();
      const methodSchema = schema[method];
      if (!methodSchema) {
        // Default to the schema itself if method-specific not found
        validationSchema = schema;
      } else {
        validationSchema = methodSchema;
      }
    } else {
      validationSchema = schema;
    }

    const { error } = validationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        })),
        code: 'VALIDATION_FAILED'
      });
    }

    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Query parameter validation error',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        })),
        code: 'VALIDATION_FAILED'
      });
    }

    next();
  };
};

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort_by: Joi.string().optional(),
  sort_order: Joi.string().valid('asc', 'desc').default('desc')
});

module.exports = {
  validateRequest,
  validateQuery,
  paginationSchema,
  schemas
};
