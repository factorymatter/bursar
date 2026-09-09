const db = require('../config/database');

class Appointment {
  static async findById(id) {
    const result = await db.query(`
      SELECT a.*, s.first_name as student_first_name, s.last_name as student_last_name,
             s.email as student_email,
             ad.first_name as advisor_first_name, ad.last_name as advisor_last_name,
             ad.email as advisor_email
      FROM appointments a
      JOIN students s ON a.student_id = s.id
      JOIN advisors ad ON a.advisor_id = ad.id
      WHERE a.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async findByStudent(studentId, status = null) {
    let query = `
      SELECT a.*, ad.first_name as advisor_first_name, ad.last_name as advisor_last_name
      FROM appointments a
      JOIN advisors ad ON a.advisor_id = ad.id
      WHERE a.student_id = $1
    `;
    const params = [studentId];

    if (status) {
      query += ` AND a.status = $2`;
      params.push(status);
    }

    query += ' ORDER BY a.scheduled_at DESC';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async findByAdvisor(advisorId, status = null, dateFrom = null, dateTo = null) {
    let query = `
      SELECT a.*, s.first_name as student_first_name, s.last_name as student_last_name
      FROM appointments a
      JOIN students s ON a.student_id = s.id
      WHERE a.advisor_id = $1
    `;
    const params = [advisorId];

    if (status) {
      query += ` AND a.status = $${params.length + 1}`;
      params.push(status);
    }

    if (dateFrom) {
      query += ` AND a.scheduled_at >= $${params.length + 1}`;
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND a.scheduled_at <= $${params.length + 1}`;
      params.push(dateTo);
    }

    query += ' ORDER BY a.scheduled_at';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async findConflicting(advisorId, scheduledAt, duration) {
    const endAt = new Date(scheduledAt.getTime() + duration * 60 * 1000);
    const result = await db.query(`
      SELECT * FROM appointments
      WHERE advisor_id = $1
        AND status IN ('scheduled', 'confirmed')
        AND scheduled_at < $2
        AND (scheduled_at + (duration * INTERVAL '1 minute')) > $1
      LIMIT 1
    `, [advisorId, endAt, scheduledAt]);
    return result.rows[0];
  }

  static async create(data) {
    const {
      student_id,
      advisor_id,
      institution_id,
      warning_id,
      scheduled_at,
      duration,
      location,
      meeting_type,
      status,
      notes,
      created_by
    } = data;

    const result = await db.query(
      `INSERT INTO appointments (
        student_id, advisor_id, institution_id, warning_id,
        scheduled_at, duration, location, meeting_type, status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        student_id, advisor_id, institution_id, warning_id,
        scheduled_at, duration || 30, location, meeting_type || 'virtual',
        status || 'scheduled', notes || '', created_by
      ]
    );
    return result.rows[0];
  }

  static async updateStatus(id, status, notes = null) {
    const fields = ['status = $1'];
    const params = [status];

    if (status === 'completed' || status === 'cancelled') {
      fields.push('completed_at = $' + (params.length + 1));
      params.push(new Date());
    }

    if (notes) {
      fields.push('notes = $' + (params.length + 1));
      params.push(notes);
    }

    params.push(id);
    const query = `UPDATE appointments SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`;
    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async getUpcomingForStudent(studentId) {
    const result = await db.query(`
      SELECT a.*, ad.first_name as advisor_first_name, ad.last_name as advisor_last_name
      FROM appointments a
      JOIN advisors ad ON a.advisor_id = ad.id
      WHERE a.student_id = $1
        AND a.status IN ('scheduled', 'confirmed')
        AND a.scheduled_at > CURRENT_TIMESTAMP
      ORDER BY a.scheduled_at
      LIMIT 10
    `, [studentId]);
    return result.rows;
  }

  static async getStatsByAdvisor(advisorId, dateFrom, dateTo) {
    const result = await db.query(`
      SELECT
        COUNT(*) as total_appointments,
        COUNT(*) FILTER (WHERE status = 'scheduled' OR status = 'confirmed') as upcoming,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled' OR status = 'no_show') as missed
      FROM appointments
      WHERE advisor_id = $1 AND scheduled_at BETWEEN $2 AND $3
    `, [advisorId, dateFrom, dateTo]);
    return result.rows[0];
  }
}

module.exports = Appointment;
