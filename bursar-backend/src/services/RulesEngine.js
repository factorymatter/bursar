const Rule = require('../models/Rule');

class RulesEngine {
  constructor() {
    this.operators = {
      eq: (a, b) => a === b,
      neq: (a, b) => a !== b,
      lt: (a, b) => a < b,
      lte: (a, b) => a <= b,
      gt: (a, b) => a > b,
      gte: (a, b) => a >= b,
      in: (a, b) => Array.isArray(b) && b.includes(a),
      not_in: (a, b) => Array.isArray(b) && !b.includes(a),
      contains: (a, b) => {
        if (Array.isArray(a)) {
          return a.some(item => String(item).includes(String(b)));
        }
        return String(a).includes(String(b));
      },
      matches: (a, b) => {
        if (typeof b !== 'string') return false;
        const regex = new RegExp(b, 'i');
        return regex.test(String(a));
      }
    };
  }

  async evaluateCondition(condition, context) {
    const { field, operator, value } = condition;

    // Support nested fields with dot notation (e.g., 'student.sap_status')
    const fieldValue = this.getNestedValue(context, field);

    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    const operatorFn = this.operators[operator];
    if (!operatorFn) {
      throw new Error(`Unknown operator: ${operator}`);
    }

    try {
      return operatorFn(fieldValue, value);
    } catch (error) {
      console.error(`Error evaluating condition ${field} ${operator}:`, error);
      return false;
    }
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }

  async evaluateRule(rule, context, studentId, institutionId) {
    const startTime = Date.now();
    let triggered = false;
    let evaluationDetails = {
      conditions_evaluated: [],
      all_conditions_met: false
    };

    try {
      // Evaluate all conditions (AND logic by default)
      const conditionResults = await Promise.all(
        rule.conditions.map(async (condition, index) => {
          const result = await this.evaluateCondition(condition, context);
          evaluationDetails.conditions_evaluated.push({
            index,
            condition,
            result
          });
          return result;
        })
      );

      triggered = conditionResults.every(result => result === true);
      evaluationDetails.all_conditions_met = triggered;

      const executionTimeMs = Date.now() - startTime;

      return {
        triggered,
        execution_time_ms: executionTimeMs,
        evaluation_details: evaluationDetails
      };
    } catch (error) {
      console.error('Error in evaluateRule:', error);
      throw error;
    }
  }

  async testRule(ruleId, studentId, simulatdChange = {}) {
    // Fetch rule
    const rule = await Rule.findById(ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    // Fetch student and related data
    const Student = require('../models/Student');
    const Enrollment = require('../models/Enrollment');

    const student = await Student.findById(studentId);
    if (!student) {
      throw new Error(`Student ${studentId} not found`);
    }

    // Build evaluation context
    const context = {
      student: {
        sap_status: student.sap_status,
        enrollment_status: student.enrollment_status,
        expected_completion: student.expected_completion,
        program_id: student.program_id,
        metadata: student.metadata || {}
      },
      current_enrollments: await Enrollment.getEnrollmentsForWarningEval(studentId, null),
      ...simulatedChange
    };

    // Evaluate rule
    const result = await this.evaluateRule(rule, context, studentId, student.institution_id);

    return {
      rule_id: ruleId,
      rule_name: rule.name,
      student_id: studentId,
      triggered: result.triggered,
      execution_time_ms: result.execution_time_ms,
      evaluation_details: result.evaluation_details,
      context
    };
  }

  async evaluateRulesForStudent(studentId, institutionId, changeRequest = null, context = null) {
    // Fetch all active rules for the institution
    const rules = await Rule.findAllForInstitution(institutionId, { is_active: true });

    // Sort by priority
    rules.sort((a, b) => (a.priority || 100) - (b.priority || 100));

    const Student = require('../models/Student');
    const Enrollment = require('../models/Enrollment');

    // Fetch student
    const student = await Student.findById(studentId);
    if (!student) {
      throw new Error(`Student ${studentId} not found`);
    }

    // Build evaluation context if not provided
    if (!context) {
      const enrollments = changeRequest
        ? await Enrollment.getEnrollmentsForWarningEval(studentId, changeRequest.term_id)
        : await Enrollment.getEnrollmentsForWarningEval(studentId, null);

      context = {
        student: {
          sap_status: student.sap_status,
          enrollment_status: student.enrollment_status,
          expected_completion: student.expected_completion,
          program_id: student.program_id,
          metadata: student.metadata || {}
        },
        current_enrollments: enrollments,
        enrollment_change: changeRequest || null
      };
    }

    const triggeredRules = [];
    const evaluationResults = [];

    for (const rule of rules) {
      try {
        const result = await this.evaluateRule(rule, context, studentId, institutionId);

        evaluationResults.push({
          rule_id: rule.id,
          rule_name: rule.name,
          category: rule.category,
          triggered: result.triggered,
          execution_time_ms: result.execution_time_ms,
          evaluation_details: result.evaluation_details
        });

        if (result.triggered) {
          triggeredRules.push({
            rule,
            evaluation: result
          });
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id} (${rule.name}):`, error);
      }
    }

    return {
      student_id: studentId,
      institution_id,
      rules_evaluated: rules.length,
      triggered_count: triggeredRules.length,
      triggered_rules: triggeredRules,
      evaluation_results: evaluationResults,
      context_summary: {
        student_status: student.sap_status,
        enrollment_count: context.current_enrollments?.length || 0,
        has_change_request: !!changeRequest
      }
    };
  }
}

module.exports = RulesEngine;
