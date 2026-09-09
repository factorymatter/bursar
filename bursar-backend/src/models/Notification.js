const db = require('../config/database');

class Notification {
  static async findById(id) {
    const result = await db.query(`
      SELECT n.*, s.first_name as student_first_name, s.last_name as student_last_name
      FROM notifications n
      JOIN students s ON n.recipient_id = s.id
      WHERE n.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async findByRecipient(recipientId, status = null) {
    let query = `
      SELECT * FROM notifications
      WHERE recipient_id = $1
    `;
    const params = [recipientId];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async create(data) {
    const {
      recipient_id,
      institution_id,
      type,
      channel,
      title,
      body,
      data,
      priority,
      scheduled_for
    } = data;

    const result = await db.query(
      `INSERT INTO notifications (
        recipient_id, institution_id, type, channel,
        title, body, data, priority, scheduled_for
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        recipient_id, institution_id, type, channel,
        title, body, data || {}, priority || 'normal',
        scheduled_for || new Date()
      ]
    );
    return result.rows[0];
  }

  static async markSent(id) {
    const result = await db.query(
      'UPDATE notifications SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      ['sent', id]
    );
    return result.rows[0];
  }

  static async markRead(id) {
    const result = await db.query(
      'UPDATE notifications SET status = $1, read_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      ['read', id]
    );
    return result.rows[0];
  }

  static async markFailed(id, error) {
    const result = await db.query(
      'UPDATE notifications SET status = $1, failure_reason = $2 WHERE id = $3 RETURNING *',
      ['failed', error, id]
    );
    return result.rows[0];
  }

  static async getPendingBatch(channel, limit = 100) {
    const result = await db.query(`
      SELECT n.*, s.email as recipient_email
      FROM notifications n
      JOIN students s ON n.recipient_id = s.id
      WHERE n.channel = $1 AND n.status = 'pending'
        AND (n.scheduled_for IS NULL OR n.scheduled_for <= CURRENT_TIMESTAMP)
      ORDER BY n.priority DESC, n.created_at ASC
      LIMIT $2
      FOR UPDATE SKIP LOCKED
    `, [channel, limit]);
    return result.rows;
  }

  static async getStatsByInstitution(institutionId, dateFrom, dateTo) {
    const result = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'read') as read,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE type = 'warning') as warning_notifications,
        COUNT(*) FILTER (WHERE channel = 'email') as email_notifications,
        COUNT(*) FILTER (WHERE channel = 'sms') as sms_notifications
      FROM notifications
      WHERE institution_id = $1 AND created_at BETWEEN $2 AND $3
    `, [institutionId, dateFrom, dateTo]);
    return result.rows[0];
  }
}

module.exports = Notification;
