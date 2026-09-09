const db = require('../config/database');

class Advisor {
  static async findById(id) {
    const result = await db.query(`
      SELECT a.*, i.name as institution_name, i.code as institution_code
      FROM advisors a
      JOIN institutions i ON a.institution_id = i.id
      WHERE a.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async findByEmail(email, institutionId = null) {
    let query = 'SELECT * FROM advisors WHERE email = $1';
    const params = [email];

    if (institutionId) {
      query += ' AND institution_id = $2';
      params.push(institutionId);
    }

    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async findAllForInstitution(institutionId, filters = {}) {
    let query = 'SELECT * FROM advisors WHERE institution_id = $1';
    const params = [institutionId];

    if (filters.is_active !== undefined) {
      query += ` AND is_active = $${params.length + 1}`;
      params.push(filters.is_active);
    }

    if (filters.department) {
      query += ` AND department = $${params.length + 1}`;
      params.push(filters.department);
    }

    query += ' ORDER BY first_name, last_name';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async create(data) {
    const {
      institution_id,
      first_name,
      last_name,
      email,
      phone,
      title,
      department,
      timezone,
      settings,
      is_active
    } = data;

    const result = await db.query(
      `INSERT INTO advisors (
        institution_id, first_name, last_name, email, phone,
        title, department, timezone, settings, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        institution_id, first_name, last_name, email, phone,
        title, department, timezone, settings || {}, is_active !== false
      ]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'title',
      'department', 'timezone', 'settings', 'is_active'
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
    const query = `UPDATE advisors SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async getAvailableAdvisors(institutionId, date) {
    const result = await db.query(`
      SELECT a.*, aa.weekday, aa.start_time, aa.end_time
      FROM advisors a
      LEFT JOIN advisor_availability aa ON a.id = aa.advisor_id
      WHERE a.institution_id = $1
        AND a.is_active = true
        AND (aa.weekday IS NULL OR aa.weekday = EXTRACT(DOW FROM $2::date))
      ORDER BY a.first_name, a.last_name
    `, [institutionId, date]);
    return result.rows;
  }
}

module.exports = Advisor;
