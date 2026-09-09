const express = require('express');
const router = express.Router();
const controller = require('../controllers/sapAppealController');
const { auth, requireScope } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

router.use(auth);
router.use(requireScope('sap_appeal:read'));

// GET /api/v1/sap-appeals - list SAP appeals
router.get('/', controller.getAllAppeals);

// GET /api/v1/sap-appeals/:id - get appeal details
router.get('/:id', controller.getAppeal);

// POST /api/v1/sap-appeals - submit SAP appeal
router.post(
  '/',
  requireScope('sap_appeal:write'),
  validateRequest(schemas.sapAppeal.create),
  controller.createAppeal
);

// PUT /api/v1/sap-appeals/:id/status - update appeal status
router.put(
  '/:id/status',
  requireScope('sap_appeal:write'),
  validateRequest(schemas.sapAppeal.updateStatus),
  controller.updateAppealStatus
);

// GET /api/v1/students/:student_id/appeals - get student's appeals
router.get('/students/:student_id', controller.getStudentAppeals);

// GET /api/v1/institutions/:institution_id/sap-appeals/stats - get appeal stats
router.get('/institutions/:institution_id/stats', controller.getInstitutionStats);

module.exports = router;
