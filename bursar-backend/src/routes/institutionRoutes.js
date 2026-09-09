const express = require('express');
const router = express.Router();
const controller = require('../controllers/institutionController');
const { auth, requireScope } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

// All routes require authentication
router.use(auth);

// GET /api/v1/institutions - list all institutions
router.get('/', controller.getAllInstitutions);

// GET /api/v1/institutions/:id - get single institution
router.get('/:id', controller.getInstitution);

// POST /api/v1/institutions - create institution (requires admin scope)
router.post(
  '/',
  requireScope('institution:write'),
  validateRequest(schemas.institution.create),
  controller.createInstitution
);

// PUT /api/v1/institutions/:id - update institution
router.put(
  '/:id',
  requireScope('institution:write'),
  validateRequest(schemas.institution.update),
  controller.updateInstitution
);

// DELETE /api/v1/institutions/:id - deactivate institution (soft delete)
router.delete(
  '/:id',
  requireScope('institution:write'),
  controller.deactivateInstitution
);

module.exports = router;
