const db = require('../config/database');

class AdvisorAvailability {
  static async findByAdvisor(advisorId) {
    const result = await db.query(
      'SELECT * FROM advisor_availability WHERE advisor_id = $1 ORDER BY weekday, start_time',
      [advisorId]
    );
    return result.rows;
  }

  static async findAdvisorsForDay(dayOfWeek, timeSlot = null) {
    let query = `
      SELECT a.*, ad.first_name, ad.last_name, ad.email, ad.title
      FROM advisor_availability a
      JOIN advisors ad ON a.advisor_id = ad.id
      WHERE a.weekday = $1 AND ad.is_active = true
    `;
    const params = [dayOfWeek];

    if (timeSlot) {
      query += ` AND $2::time BETWEEN a.start_time AND (a.end_time - INTERVAL '30 minutes')`;
      params.push(timeSlot);
    }

    query += ' ORDER BY a.start_time';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async create(data) {
    const { advisor_id, weekday, start_time, end_time, timezone, is_available } = data;

    const result = await db.query(
      `INSERT INTO advisor_availability (advisor_id, weekday, start_time, end_time, timezone, is_available)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [advisor_id, weekday, start_time, end_time, timezone, is_available !== false]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    const allowedFields = ['weekday', 'start_time', 'end_time', 'timezone', 'is_available'];

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
    const query = `UPDATE advisor_availability SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async delete(id) {
    const result = await db.query(
      'DELETE FROM advisor_availability WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async createBatch(slots) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      for (const slot of slots) {
        await client.query(
          `INSERT INTO advisor_availability (advisor_id, weekday, start_time, end_time, timezone, is_available)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [slot.advisor_id, slot.weekday, slot.start_time, slot.end_time, slot.timezone, slot.is_available !== false]
        );
      }

      await client.query('COMMIT');
      return { success: true, count: slots.length };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = AdvisorAvailability;
