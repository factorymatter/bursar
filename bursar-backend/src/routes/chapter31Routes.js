const express = require('express');
const router = express.Router();
const controller = require('../controllers/chapter31Controller');
const { auth, requireScope } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

router.use(auth);
router.use(requireScope('chapter31:read'));

// GET /api/v1/chapter31/enrollments - list Chapter 31 enrollments
router.get('/', controller.getAllChapter31Enrollments);

// POST /api/v1/chapter31/enrollments - create Chapter 31 enrollment
router.post(
  '/',
  requireScope('chapter31:write'),
  validateRequest(schemas.chapter31.create),
  controller.createChapter31Enrollment
);

// PUT /api/v1/chapter31/enrollments/:id - update Chapter 31 enrollment
router.put(
  '/:id',
  requireScope('chapter31:write'),
  validateRequest(schemas.chapter31.update),
  controller.updateChapter31Enrollment
);

// GET /api/v1/chapter31/invoice-report - get invoice report for institution
router.get('/invoice-report', controller.getChapter31InvoiceReport);

// POST /api/v1/chapter31/enrollments/batch-update - batch update status
router.post(
  '/enrollments/batch-update',
  requireScope('chapter31:write'),
  controller.batchUpdateStatus
);

module.exports = router;
