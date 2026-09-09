const express = require('express');
const router = express.Router();
const controller = require('../controllers/warningController');
const { auth, requireScope } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

router.use(auth);
router.use(requireScope('warning:read'));

// GET /api/v1/warnings - list warnings with filters
router.get('/', controller.getAllWarnings);

// GET /api/v1/warnings/:id - get warning details
router.get('/:id', controller.getWarning);

// PUT /api/v1/warnings/:id/status - update warning status
router.put(
  '/:id/status',
  requireScope('warning:write'),
  validateRequest(schemas.warning.updateStatus),
  controller.updateWarningStatus
);

// PUT /api/v1/warnings/:id/assign - assign warning to advisor
router.put(
  '/:id/assign',
  requireScope('warning:write'),
  controller.assignAdvisor
);

// PUT /api/v1/warnings/:id/shown - mark warning as shown to student
router.put(
  '/:id/shown',
  requireScope('warning:write'),
  controller.markShownToStudent
);

// GET /api/v1/institutions/:institution_id/warnings/stats - get warning statistics
router.get('/institutions/:institution_id/warnings/stats', controller.getInstitutionStats);

module.exports = router;
