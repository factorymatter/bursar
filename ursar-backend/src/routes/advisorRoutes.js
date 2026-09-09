const express = require('express');
const router = express.Router();
const controller = require('../controllers/advisorController');
const { auth, requireScope } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

router.use(auth);
router.use(requireScope('advisor:read'));

// GET /api/v1/advisors - list advisors
router.get('/', controller.getAllAdvisors);

// GET /api/v1/advisors/:id - get advisor details
router.get('/:id', controller.getAdvisor);

// POST /api/v1/advisors - create advisor
router.post(
  '/',
  requireScope('advisor:write'),
  validateRequest(schemas.advisor.create),
  controller.createAdvisor
);

// PUT /api/v1/advisors/:id - update advisor
router.put(
  '/:id',
  requireScope('advisor:write'),
  validateRequest(schemas.advisor.update),
  controller.updateAdvisor
);

// GET /api/v1/advisors/:id/assignments - get advisor's student assignments
router.get('/:id/assignments', controller.getAdvisorAssignments);

// POST /api/v1/advisors/assignments - assign student to advisor
router.post(
  '/assignments',
  requireScope('advisor:write'),
  validateRequest(schemas.advisorAssignment.create),
  controller.assignStudentToAdvisor
);

// GET /api/v1/students/:student_id/advisor - get assigned advisor
router.get('/students/:student_id/advisor', controller.getStudentAssignedAdvisor);

// GET /api/v1/advisors/:id/appointments - get advisor's appointments
router.get('/:id/appointments', controller.getAdvisorAppointments);

// POST /api/v1/appointments - create appointment
router.post(
  '/appointments',
  requireScope('advisor:write'),
  validateRequest(schemas.appointment.create),
  controller.createAppointment
);

// PUT /api/v1/appointments/:id - update appointment status
router.put(
  '/appointments/:id',
  requireScope('advisor:write'),
  validateRequest(schemas.appointment.updateStatus),
  controller.updateAppointmentStatus
);

// GET /api/v1/students/:student_id/appointments/upcoming - get student's upcoming appointments
router.get('/students/:student_id/appointments/upcoming', controller.getStudentUpcomingAppointments);

module.exports = router;
