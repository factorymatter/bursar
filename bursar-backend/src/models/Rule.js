const db = require('../config/database');

class Rule {
  static async findById(id) {
    const result = await db.query('SELECT * FROM rules WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByCode(institutionId, code) {
    const result = await db.query(
      'SELECT * FROM rules WHERE institution_id = $1 AND code = $2 AND is_active = $3',
      [institutionId, code, true]
    );
    return result.rows[0];
  }

  static async findByCategory(institutionId, category) {
    const result = await db.query(
      'SELECT * FROM rules WHERE institution_id = $1 AND category = $2 AND is_active = $3 ORDER BY priority',
      [institutionId, category, true]
    );
    return result.rows;
  }

  static async findAllForInstitution(institutionId, filters = {}) {
    let query = 'SELECT * FROM rules WHERE institution_id = $1';
    const params = [institutionId];

    if (filters.category) {
      query += ` AND category = $${params.length + 1}`;
      params.push(filters.category);
    }

    if (filters.is_active !== undefined) {
      query += ` AND is_active = $${params.length + 1}`;
      params.push(filters.is_active);
    }

    query += ' ORDER BY priority, created_at DESC';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async create(data) {
    const {
      institution_id,
      name,
      code,
      description,
      category,
      severity,
      conditions,
      actions,
      priority,
      institution_specific,
      created_by
    } = data;

    const result = await db.query(
      `INSERT INTO rules (
        institution_id, name, code, description, category, severity,
        conditions, actions, priority, institution_specific, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        institution_id, name, code, description, category, severity,
        conditions, actions, priority || 100, institution_specific || false, created_by
      ]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    const allowedFields = [
      'name', 'description', 'category', 'severity', 'conditions',
      'actions', 'priority', 'is_active', 'institution_specific'
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
    const query = `UPDATE rules SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async deactivate(id) {
    const result = await db.query(
      'UPDATE rules SET is_active = $1 WHERE id = $2 RETURNING *',
      [false, id]
    );
    return result.rows[0];
  }

  static async testAgainstStudent(ruleId, studentId, simulatedChange) {
    // This will be implemented by the RulesEngine service
    // The rule testing logic uses the RulesEngine
    throw new Error('Not implemented - use RulesEngine.testRule()');
  }
}

module.exports = Rule;
