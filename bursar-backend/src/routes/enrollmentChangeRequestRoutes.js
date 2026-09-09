const express = require('express');
const router = express.Router();
const controller = require('../controllers/enrollmentChangeRequestController');
const { auth, requireScope } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

router.use(auth);
router.use(requireScope('change_request:read'));

// GET /api/v1/enrollment-change-requests - list change requests
router.get('/', controller.getAllChangeRequests);

// GET /api/v1/enrollment-change-requests/:id - get change request details
router.get('/:id', controller.getChangeRequest);

// POST /api/v1/enrollment-change-requests - create change request
router.post(
  '/',
  requireScope('change_request:write'),
  validateRequest(schemas.enrollmentChangeRequest.create),
  controller.createChangeRequest
);

// PUT /api/v1/enrollment-change-requests/:id/status - update change request status
router.put(
  '/:id/status',
  requireScope('change_request:write'),
  validateRequest(schemas.enrollmentChangeRequest.updateStatus),
  controller.updateChangeRequestStatus
);

// GET /api/v1/students/:student_id/change-requests - get student's change requests
router.get('/students/:student_id', controller.getStudentChangeRequests);

// GET /api/v1/institutions/:institution_id/change-requests/pending - get pending requests
router.get('/institutions/:institution_id/pending', controller.getPendingRequests);

module.exports = router;
