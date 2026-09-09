const RulesEngine = require('./RulesEngine');
const RuleEvaluation = require('../models/RuleEvaluation');
const Warning = require('../models/Warning');
const EnrollmentChangeRequest = require('../models/EnrollmentChangeRequest');
const FinancialAidPackage = require('../models/FinancialAidPackage');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const db = require('../config/database');

class EvaluationService {
  constructor() {
    this.rulesEngine = new RulesEngine();
  }

  async evaluateEnrollmentChange(changeRequestId) {
    const changeRequest = await EnrollmentChangeRequest.findById(changeRequestId);
    if (!changeRequest) {
      throw new Error(`Enrollment change request ${changeRequestId} not found`);
    }

    const startTime = Date.now();

    try {
      // Create base context with the enrollment change
      const context = {
        student: {
          sap_status: changeRequest.student_sap_status,
          enrollment_status: changeRequest.student_enrollment_status,
          metadata: changeRequest.student_metadata || {}
        },
        enrollment_change: {
          change_type: changeRequest.change_type,
          section_id: changeRequest.section_id,
          term_id: changeRequest.term_id,
          credits_attempted: changeRequest.credits_attempted,
          reason: changeRequest.reason
        },
        current_enrollments: changeRequest.current_enrollments || [],
        financial_aid: changeRequest.financial_aid || null
      };

      // Get institution ID
      const institutionId = changeRequest.institution_id;

      // Evaluate all rules
      const evaluationResult = await this.rulesEngine.evaluateRulesForStudent(
        changeRequest.student_id,
        institutionId,
        changeRequest,
        context
      );

      // Persist rule evaluation record (parent record)
      const ruleEval = await RuleEvaluation.create({
        institution_id: institutionId,
        student_id: changeRequest.student_id,
        rule_id: null, // parent record - no specific rule
        enrollment_change_id: changeRequestId,
        triggered: evaluationResult.triggered_count > 0,
        context_snapshot: context,
        evaluation_details: {
          rules_evaluated: evaluationResult.rules_evaluated,
          triggered_count: evaluationResult.triggered_count,
          duration_ms: Date.now() - startTime
        }
      });

      // For each triggered rule, create individual evaluation records and warnings
      const warnings = [];
      for (const { rule, evaluation } of evaluationResult.triggered_rules) {
        // Save individual rule evaluation
        await RuleEvaluation.create({
          institution_id: institutionId,
          student_id: changeRequest.student_id,
          rule_id: rule.id,
          enrollment_change_id: changeRequestId,
          triggered: true,
          context_snapshot: context,
          evaluation_details: evaluation.evaluation_details,
          execution_time_ms: evaluation.execution_time_ms
        });

        // Calculate financial impact
        const impact = await this.calculateFinancialImpact(changeRequest.student_id, rule, changeRequest);

        // Create warning
        const warning = await this.createWarningFromRule(
          changeRequest.student_id,
          institutionId,
          ruleEval.id,
          changeRequestId,
          rule,
          impact,
          context
        );

        warnings.push(warning);
      }

      // Trigger async notification jobs if warnings were created
      if (warnings.length > 0) {
        // Notify via enabled channels (configured per institution)
        await this.triggerNotifications(changeRequest.institution_id, warnings);
      }

      // Log evaluation to audit trail
      await AuditLog.create({
        institution_id: institutionId,
        actor_type: 'system',
        actor_id: 'evaluation-service',
        action: 'enrollment_evaluation',
        resource_type: 'enrollment_change_request',
        resource_id: changeRequestId,
        after_state: {
          evaluation_id: ruleEval.id,
          warnings_created: warnings.length,
          triggered_rules: evaluationResult.triggered_rules.map(tr => tr.rule.name)
        }
      });

      return {
        change_request_id: changeRequestId,
        evaluation_id: ruleEval.id,
        warnings: warnings,
        evaluation_summary: evaluationResult
      };

    } catch (error) {
      console.error(`Error evaluating change request ${changeRequestId}:`, error);

      await AuditLog.create({
        institution_id: changeRequest.institution_id,
        actor_type: 'system',
        actor_id: 'evaluation-service',
        action: 'enrollment_evaluation_failed',
        resource_type: 'enrollment_change_request',
        resource_id: changeRequestId,
        metadata: { error: error.message }
      });

      throw error;
    }
  }

  async calculateFinancialImpact(studentId, rule, changeRequest) {
    // Use FinancialAidPackage model's calculateImpact method for Pell
    // In a full implementation, we'd calculate impact based on all aid types

    const FinancialAid = require('../models/FinancialAidPackage');

    // For now, get Pell impact from the model
    const impact = await FinancialAid.calculateImpact(
      studentId,
      changeRequest.term_id,
      changeRequest.credits_attempted
    );

    // Add SEOG impact if applicable (similar percentage-based)
    // Could also check rule actions for specific aid types

    return impact;
  }

  async createWarningFromRule(studentId, institutionId, ruleEvalId, changeRequestId, rule, impact, context) {
    // Generate warning message by applying template
    const message = this.interpolateMessage(rule.actions, context, impact);

    // Determine severity from rule
    const severity = rule.severity || 'medium';

    // Determine which aid types are affected
    const aidTypesAffected = this.extractAidTypesFromRule(rule);

    return await Warning.create({
      student_id: studentId,
      institution_id: institutionId,
      rule_evaluation_id: ruleEvalId,
      enrollment_change_id: changeRequestId,
      severity: severity,
      title: rule.name,
      message: message,
      financial_impact: impact.impact,
      aid_types_affected: aidTypesAffected,
      context_data: {
        rule_category: rule.category,
        evaluation_context: context,
        impact_details: impact.details
      }
    });
  }

  interpolateMessage(actions, context, impact) {
    // Actions contains notification templates
    const warningAction = actions.find(a => a.type === 'create_warning' || a.type === 'notify_student');
    if (!warningAction) {
      return 'This enrollment change may affect your financial aid. Please consult with your advisor.';
    }

    const template = warningAction.config?.message || 'Warning: {rule_name}. Financial impact: ${impact}';

    // Simple string substitution with context variables
    let message = template;

    // Replace placeholders
    message = message.replace('{rule_name}', context.student?.sap_status || 'Enrollment Change');
    message = message.replace('${impact}', this.formatCurrency(impact.impact));
    message = message.replace('{credits}', context.enrollment_change?.credits_attempted || '0');
    message = message.replace('{status}', context.student?.sap_status || 'unknown');

    // Could add more sophisticated templating here

    return message;
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount));
  }

  extractAidTypesFromRule(rule) {
    // Parse rule actions to determine which aid types are affected
    const aidTypes = [];

    if (rule.category === 'financial_aid') {
      aidTypes.push('pell_grant');
    }

    if (rule.actions) {
      rule.actions.forEach(action => {
        if (action.type === 'calculate_impact') {
          aidTypes.push(...(action.config?.aid_types || ['pell_grant']));
        }
      });
    }

    return [...new Set(aidTypes)]; // deduplicate
  }

  async triggerNotifications(institutionId, warnings) {
    // This would be implemented properly with a job queue or service
    // For now, we'll just log that notifications would be sent
    console.log(`Would send notifications for ${warnings.length} warnings at institution ${institutionId}`);

    // In production:
    // 1. Queue notification jobs (Redis/ Bull / Amazon SQS)
    // 2. NotificationService would process the queue
    // 3. Respect student notification preferences
    // 4. Handle SMS, email, in-app delivery
    // 5. Rate limiting per institution
  }
}

module.exports = EvaluationService;
