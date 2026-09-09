const db = require('../config/database');

class SISIntegration {
  static async findById(id) {
    const result = await db.query(`
      SELECT si.*, i.name as institution_name
      FROM sis_integrations si
      JOIN institutions i ON si.institution_id = i.id
      WHERE si.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async findByInstitution(institutionId) {
    const result = await db.query(`
      SELECT * FROM sis_integrations
      WHERE institution_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `, [institutionId]);
    return result.rows[0];
  }

  static async findByVendor(institutionId, vendorName) {
    const result = await db.query(
      'SELECT * FROM sis_integrations WHERE institution_id = $1 AND vendor_name = $2 AND is_active = true',
      [institutionId, vendorName]
    );
    return result.rows[0];
  }

  static async create(data) {
    const {
      institution_id,
      vendor_name,
      version,
      integration_type,
      configuration,
      webhook_secret,
      sync_schedule,
      last_sync_at
    } = data;

    const result = await db.query(
      `INSERT INTO sis_integrations (
        institution_id, vendor_name, version, integration_type,
        configuration, webhook_secret, sync_schedule, last_sync_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        institution_id, vendor_name, version, integration_type,
        configuration || {}, webhook_secret, sync_schedule, last_sync_at
      ]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    const allowedFields = [
      'vendor_name', 'version', 'integration_type', 'configuration',
      'webhook_secret', 'sync_schedule', 'last_sync_at', 'last_error',
      'is_active'
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
    const query = `UPDATE sis_integrations SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async updateLastSync(id, success, error = null) {
    const updates = ['last_sync_at = $1'];
    const params = [new Date()];

    if (!success) {
      updates.push('last_error = $2');
      params.push(error);
    } else {
      updates.push('last_error = $3');
      params.push(null);
    }

    params.push(id);
    const query = `UPDATE sis_integrations SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`;
    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async verifyWebhookSignature(secret, payload, signature) {
    // HMAC verification using webhook_secret
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

module.exports = SISIntegration;
