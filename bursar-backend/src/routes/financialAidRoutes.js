const express = require('express');
const router = express.Router();
const controller = require('../controllers/financialAidController');
const { auth, requireScope } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

router.use(auth);
router.use(requireScope('financial_aid:read'));

// GET /api/v1/financial-aid - list financial aid packages
router.get('/', controller.getAllFinancialAidPackages);

// GET /api/v1/financial-aid/:id - get financial aid package
router.get('/:id', controller.getFinancialAidPackage);

// POST /api/v1/financial-aid - create financial aid package
router.post(
  '/',
  requireScope('financial_aid:write'),
  validateRequest(schemas.financialAid.create),
  controller.createFinancialAidPackage
);

// PUT /api/v1/financial-aid/:id - update financial aid package
router.put(
  '/:id',
  requireScope('financial_aid:write'),
  validateRequest(schemas.financialAid.update),
  controller.updateFinancialAidPackage
);

// GET /api/v1/financial-aid/student/:student_id/active - get active aid for student
router.get('/student/:student_id/active', controller.getActiveAidByStudent);

// POST /api/v1/financial-aid/calculate-impact - calculate financial impact of credit change
router.post(
  '/calculate-impact',
  controller.calculateImpact
);

// GET /api/v1/students/:student_id/aid-summary - get student's aid summary
router.get('/students/:student_id/summary', controller.getStudentAidSummary);

module.exports = router;
