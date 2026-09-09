const express = require('express');
const router = express.Router();
const controller = require('../controllers/sisIntegrationController');
const { auth, requireScope } = require('../middleware/auth');

router.use(auth);
router.use(requireScope('sis:read'));

// GET /api/v1/sis-integrations - list SIS integrations for institution
router.get('/institutions/:institution_id', controller.getAllIntegrations);

// GET /api/v1/sis-integrations/:id - get integration details
router.get('/:id', controller.getIntegration);

// POST /api/v1/sis-integrations - create SIS integration
router.post(
  '/',
  requireScope('sis:write'),
  validateRequest(schemas.sisIntegration.create),
  controller.createIntegration
);

// PUT /api/v1/sis-integrations/:id - update SIS integration
router.put(
  '/:id',
  requireScope('sis:write'),
  validateRequest(schemas.sisIntegration.update),
  controller.updateIntegration
);

// POST /api/v1/sis-integrations/webhook/:institution_id - receive SIS webhook
router.post(
  '/webhook/:institution_id',
  validateRequest(schemas.sisWebhook),
  controller.handleWebhook
);

module.exports = router;
