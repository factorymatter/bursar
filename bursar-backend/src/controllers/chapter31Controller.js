const Chapter31Enrollment = require('../models/Chapter31Enrollment');
const { validationResult } = require('express-validator');

exports.getAllChapter31Enrollments = async (req, res, next) => {
  try {
    const { institution_id, status, veteran_id, page = 1, limit = 20 } = req.query;

    let query = 'SELECT * FROM chapter31_enrollments WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (institution_id) {
      query += ` AND institution_id = $${paramCount}`;
      params.push(institution_id);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (veteran_id) {
      query += ` AND veteran_id = $${paramCount}`;
      params.push(veteran_id);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await Chapter31Enrollment.db.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      meta: {
        count: result.rows.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.createChapter31Enrollment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const enrollment = await Chapter31Enrollment.create(req.body);

    await require('../models/AuditLog').create({
      institution_id: enrollment.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'create',
      resource_type: 'chapter31_enrollment',
      resource_id: enrollment.id,
      after_state: enrollment
    });

    res.status(201).json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    next(error);
  }
};

exports.updateChapter31Enrollment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await Chapter31Enrollment.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Chapter 31 enrollment not found',
        code: 'NOT_FOUND'
      });
    }

    const enrollment = await Chapter31Enrollment.update(id, req.body);

    await require('../models/AuditLog').create({
      institution_id: enrollment.institution_id,
      actor_type: 'user',
      actor_id: req.user.id,
      action: 'update',
      resource_type: 'chapter31_enrollment',
      resource_id: enrollment.id,
      before_state: existing,
      after_state: enrollment
    });

    res.json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    next(error);
  }
};

exports.getChapter31InvoiceReport = async (req, res, next) => {
  try {
    const { institution_id } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date are required',
        code: 'MISSING_PARAMETER'
      });
    }

    const result = await Chapter31Enrollment.db.query(`
      SELECT
        COUNT(*) as total_enrollments,
        SUM(tuition_fee) as total_tuition_fee,
        SUM(books_supplies_fee) as total_books_supplies,
        SUM(kicker_fee) as total_kicker,
        COUNT(*) FILTER (WHERE status = 'submitted') as submitted_count,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count
      FROM chapter31_enrollments
      WHERE institution_id = $1
        AND reporting_date BETWEEN $2 AND $3
    `, [institution_id, start_date, end_date]);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

exports.batchUpdateStatus = async (req, res, next) => {
  try {
    const { institution_id } = req.params;
    const { enrollment_ids, new_status } = req.body;

    if (!Array.isArray(enrollment_ids) || !new_status) {
      return res.status(400).json({
        success: false,
        error: 'enrollment_ids (array) and new_status are required',
        code: 'MISSING_PARAMETER'
      });
    }

    // Use a transaction
    const client = await Chapter31Enrollment.db.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'UPDATE chapter31_enrollments SET status = $1 WHERE id = ANY($2) RETURNING *',
        [new_status, enrollment_ids]
      );

      await client.query('COMMIT');

      await require('../models/AuditLog').create({
        institution_id: institution_id,
        actor_type: 'user',
        actor_id: req.user.id,
        action: 'batch_update_status',
        resource_type: 'chapter31_enrollment',
        metadata: { count: result.rows.length, new_status }
      });

      res.json({
        success: true,
        data: result.rows,
        meta: { count: result.rows.length }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};
