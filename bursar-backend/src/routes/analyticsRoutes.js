const express = require('express');
const router = express.Router();
const controller = require('../controllers/analyticsController');
const { auth, requireScope } = require('../middleware/auth');

router.use(auth);
router.use(requireScope('analytics:read'));

// GET /api/v1/analytics/dashboard - dashboard summary
router.get('/institutions/:institution_id/dashboard', controller.getDashboardSummary);

// GET /api/v1/analytics/daily - get daily analytics
router.get('/institutions/:institution_id/daily', controller.getDailyAnalytics);

// POST /api/v1/analytics/daily/regenerate - regenerate daily report
router.post(
  '/institutions/:institution_id/daily/regenerate',
  requireScope('analytics:write'),
  controller.regenerateDailyReport
);

// GET /api/v1/analytics/warnings/trends - warning trends over time
router.get('/institutions/:institution_id/warnings/trends', controller.getWarningTrends);

// GET /api/v1/analytics/rules/top - top triggered rules
router.get('/institutions/:institution_id/rules/top', controller.getTopRulesTriggered);

// GET /api/v1/analytics/impact/by-aid-type - financial impact by aid type
router.get('/institutions/:institution_id/impact/by-aid-type', controller.getFinancialImpactByAidType);

// GET /api/v1/analytics/advisors/performance - advisor performance metrics
router.get('/institutions/:institution_id/advisors/performance', controller.getAdvisorPerformance);

// GET /api/v1/analytics/compliance - compliance metrics report
router.get('/institutions/:institution_id/compliance', controller.getComplianceMetrics);

module.exports = router;
