const db = require('../config/database');

class Institution {
  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM institutions WHERE id = $1 AND status = $2',
      [id, 'active']
    );
    return result.rows[0];
  }

  static async findByCode(code) {
    const result = await db.query(
      'SELECT * FROM institutions WHERE code = $1 AND status = $2',
      [code, 'active']
    );
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM institutions WHERE status = $1';
    let params = ['active'];

    if (filters.type) {
      query += ' AND type = $' + (params.length + 1);
      params.push(filters.type);
    }

    query += ' ORDER BY name';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async create(data) {
    const {
      name,
      code,
      type,
      timezone,
      academic_calendar,
      settings,
      sis_type,
      sis_config
    } = data;

    const result = await db.query(
      `INSERT INTO institutions (name, code, type, timezone, academic_calendar, settings, sis_type, sis_config)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, code, type, timezone, academic_calendar, settings, sis_type, sis_config]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        params.push(data[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);
    const query = `UPDATE institutions SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async deactivate(id) {
    const result = await db.query(
      'UPDATE institutions SET status = $1 WHERE id = $2 RETURNING *',
      ['inactive', id]
    );
    return result.rows[0];
  }
}

module.exports = Institution;
