const express = require('express');
const router = express.Router();
const controller = require('../controllers/ruleController');
const { auth, requireScope } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

router.use(auth);
router.use(requireScope('rule:read'));

// GET /api/v1/rules - list rules with filters
router.get('/', controller.getAllRules);

// GET /api/v1/rules/:id - get rule details
router.get('/:id', controller.getRule);

// POST /api/v1/rules - create rule
router.post(
  '/',
  requireScope('rule:write'),
  validateRequest(schemas.rule.create),
  controller.createRule
);

// PUT /api/v1/rules/:id - update rule
router.put(
  '/:id',
  requireScope('rule:write'),
  validateRequest(schemas.rule.update),
  controller.updateRule
);

// DELETE /api/v1/rules/:id - deactivate rule
router.delete(
  '/:id',
  requireScope('rule:write'),
  controller.deactivateRule
);

// GET /api/v1/rules/:id/test - test rule against student
router.post(
  '/:id/test',
  validateRequest(schemas.rule.test),
  controller.testRule
);

// POST /api/v1/rules/evaluate/student/:student_id - evaluate all rules for a student
router.post(
  '/evaluate/student/:student_id',
  controller.evaluateStudent
);

// GET /api/v1/rules/categories - get rule categories for institution
router.get('/categories/institution/:institutionId', controller.getRuleCategories);

module.exports = router;
