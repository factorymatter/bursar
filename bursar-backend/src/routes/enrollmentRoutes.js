const express = require('express');
const router = express.Router();
const controller = require('../controllers/enrollmentController');
const { auth, requireScope } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

router.use(auth);

// All routes require at least read access to enrollments
router.use(requireScope('enrollment:read'));

// GET /api/v1/enrollments - list enrollments with filters
router.get('/', controller.getAllEnrollments);

// GET /api/v1/enrollments/:id - get enrollment details
router.get('/:id', controller.getEnrollment);

// POST /api/v1/enrollments - create enrollment
router.post(
  '/',
  requireScope('enrollment:write'),
  validateRequest(schemas.enrollment.create),
  controller.createEnrollment
);

// PUT /api/v1/enrollments/:id - update enrollment status
router.put(
  '/:id',
  requireScope('enrollment:write'),
  validateRequest(schemas.enrollment.updateStatus),
  controller.updateEnrollmentStatus
);

// DELETE /api/v1/enrollments/:id - drop enrollment
router.delete(
  '/:id',
  requireScope('enrollment:write'),
  controller.dropEnrollment
);

// GET /api/v1/enrollments/:id/capacity - get section capacity
router.get('/:id/capacity', controller.getEnrollmentCapacity);

module.exports = router;
