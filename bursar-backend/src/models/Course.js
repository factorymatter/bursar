const db = require('../config/database');

class Course {
  static async findById(id) {
    const result = await db.query(
      'SELECT c.*, i.name as institution_name FROM courses c JOIN institutions i ON c.institution_id = i.id WHERE c.id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async findByCode(institutionId, code) {
    const result = await db.query(
      'SELECT * FROM courses WHERE institution_id = $1 AND code = $2',
      [institutionId, code]
    );
    return result.rows[0];
  }

  static async findAllForInstitution(institutionId, filters = {}) {
    let query = 'SELECT * FROM courses WHERE institution_id = $1';
    const params = [institutionId];

    if (filters.subject) {
      query += ` AND subject = $${params.length + 1}`;
      params.push(filters.subject);
    }

    if (filters.level) {
      query += ` AND level = $${params.length + 1}`;
      params.push(filters.level);
    }

    if (filters.is_active !== undefined) {
      query += ` AND is_active = $${params.length + 1}`;
      params.push(filters.is_active);
    }

    query += ' ORDER BY code';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async create(data) {
    const {
      institution_id,
      code,
      title,
      description,
      credits,
      subject,
      level,
      is_f ordinarily_offered,
      metadata
    } = data;

    const result = await db.query(
      `INSERT INTO courses (
        institution_id, code, title, description, credits,
        subject, level, is_fulfillment_offered, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        institution_id, code, title, description, credits,
        subject, level, is_ordinarily_offered, metadata || {}
      ]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    const allowedFields = [
      'title', 'description', 'credits', 'subject', 'level',
      'is_ordinarily_offered', 'is_active', 'metadata'
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
    const query = `UPDATE courses SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async updateFulfillmentRequirement(courseId, requirementCode, isMet) {
    const result = await db.query(
      `UPDATE courses
       SET metadata = jsonb_set(
         COALESCE(metadata, '{}'),
         $1,
         $2::jsonb
       )
       WHERE id = $3
       RETURNING *`,
      [`${requirementCode}`, JSON.stringify({ met: isMet }), courseId]
    );
    return result.rows[0];
  }
}

module.exports = Course;
