const db = require('../config/database');

class Section {
  static async findById(id) {
    const result = await db.query(`
      SELECT s.*, c.code as course_code, c.title as course_title, c.credits as course_credits
      FROM sections s
      JOIN courses c ON s.course_id = c.id
      WHERE s.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async findByInstitutionAndTerm(institutionId, termId, filters = {}) {
    let query = `
      SELECT s.*, c.code as course_code, c.title as course_title, c.credits as course_credits
      FROM sections s
      JOIN courses c ON s.course_id = c.id
      WHERE s.institution_id = $1 AND s.term_id = $2
    `;
    const params = [institutionId, termId];

    if (filters.course_id) {
      query += ` AND s.course_id = $${params.length + 1}`;
      params.push(filters.course_id);
    }

    if (filters.instructor_id) {
      query += ` AND s.instructor_id = $${params.length + 1}`;
      params.push(filters.instructor_id);
    }

    if (filters.is_active !== undefined) {
      query += ` AND s.is_active = $${params.length + 1}`;
      params.push(filters.is_active);
    }

    query += ' ORDER BY c.code, s.section_number';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async create(data) {
    const {
      institution_id,
      term_id,
      course_id,
      section_number,
      instructor_id,
      max_enrollment,
      waitlist_max,
      meeting_times,
      location,
      delivery_method,
      is_active,
      metadata
    } = data;

    const result = await db.query(
      `INSERT INTO sections (
        institution_id, term_id, course_id, section_number,
        instructor_id, max_enrollment, waitlist_max, meeting_times,
        location, delivery_method, is_active, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        institution_id, term_id, course_id, section_number,
        instructor_id, max_enrollment, waitlist_max || 0,
        meeting_times || [], location, delivery_method,
        is_active !== false, metadata || {}
      ]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    const allowedFields = [
      'section_number', 'instructor_id', 'max_enrollment', 'waitlist_max',
      'meeting_times', 'location', 'delivery_method', 'is_active', 'metadata'
    ];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${paramCount}`);
        params.push(data[field]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);
    const query = `UPDATE sections SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async getAvailableCapacity(sectionId) {
    const result = await db.query(`
      SELECT
        s.max_enrollment - COUNT(e.id) as available_seats,
        s.max_enrollment as total_seats,
        COUNT(e.id) as enrolled_count
      FROM sections s
      LEFT JOIN enrollments e ON s.id = e.section_id AND e.status = 'enrolled'
      WHERE s.id = $1
      GROUP BY s.id
    `, [sectionId]);
    return result.rows[0];
  }

  static async getEnrollmentCount(sectionId) {
    const result = await db.query(
      'SELECT COUNT(*) as count FROM enrollments WHERE section_id = $1 AND status = $2',
      [sectionId, 'enrolled']
    );
    return result.rows[0].count;
  }
}

module.exports = Section;
