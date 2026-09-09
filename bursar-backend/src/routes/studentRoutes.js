const express = require('express');
const router = express.Router();
const controller = require('../controllers/studentController');
const { auth, requireScope, requireInstitutionAccess } = require('../middleware/auth');
const { validateRequest, paginationSchema } = require('../middleware/validation');

router.use(auth);

// GET /api/v1/students - list students (with optional institution filter)
router.get(
  '/',
  requireScope('student:read'),
  controller.getAllStudents
);

// GET /api/v1/students/:id - get student details
router.get(
  '/:id',
  requireScope('student:read'),
  controller.getStudent
);

// POST /api/v1/students - create student
router.post(
  '/',
  requireScope('student:write'),
  validateRequest(schemas.student.create),
  controller.createStudent
);

// PUT /api/v1/students/:id - update student
router.put(
  '/:id',
  requireScope('student:write'),
  validateRequest(schemas.student.update),
  controller.updateStudent
);

// GET /api/v1/students/:id/enrollments - get student enrollments
router.get(
  '/:id/enrollments',
  requireScope('student:read'),
  controller.getStudentEnrollments
);

// GET /api/v1/students/:id/financial-aid - get student financial aid
router.get(
  '/:id/financial-aid',
  requireScope('student:read'),
  controller.getStudentFinancialAid
);

// GET /api/v1/students/:id/warnings - get student warnings
router.get(
  '/:id/warnings',
  requireScope('warning:read'),
  controller.getStudentWarnings
);

// GET /api/v1/students/:id/credits - get total credits for student in term
router.get(
  '/:id/credits',
  requireScope('student:read'),
  controller.getStudentTotalCredits
);

module.exports = router;
