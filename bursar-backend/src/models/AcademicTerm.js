const db = require('../config/database');

class AcademicTerm {
  static async findById(id) {
    const result = await db.query('SELECT * FROM academic_terms WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByCode(institutionId, code) {
    const result = await db.query(
      'SELECT * FROM academic_terms WHERE institution_id = $1 AND code = $2',
      [institutionId, code]
    );
    return result.rows[0];
  }

  static async findCurrent(institutionId) {
    const result = await db.query(`
      SELECT * FROM academic_terms
      WHERE institution_id = $1
        AND start_date <= CURRENT_DATE
        AND end_date >= CURRENT_DATE
      LIMIT 1
    `, [institutionId]);
    return result.rows[0];
  }

  static async findAllForInstitution(institutionId, activeOnly = true) {
    let query = 'SELECT * FROM academic_terms WHERE institution_id = $1';
    const params = [institutionId];

    if (activeOnly) {
      query += ' AND is_current = true';
    }

    query += ' ORDER BY start_date DESC';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async create(data) {
    const {
      institution_id,
      code,
      name,
      academic_year,
      term_type,
      start_date,
      end_date,
      add_drop_deadline,
      withdrawal_deadline,
      is_current
    } = data;

    const result = await db.query(
      `INSERT INTO academic_terms (
        institution_id, code, name, academic_year, term_type,
        start_date, end_date, add_drop_deadline, withdrawal_deadline, is_current
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        institution_id, code, name, academic_year, term_type,
        start_date, end_date, add_drop_deadline, withdrawal_deadline,
        is_current !== false
      ]
    );
    return result.rows[0];
  }

  static async setCurrentTerm(termId) {
    // First, clear all current flags
    await db.query('UPDATE academic_terms SET is_current = false');

    // Then set the specified term as current
    const result = await db.query(
      'UPDATE academic_terms SET is_current = true WHERE id = $1 RETURNING *',
      [termId]
    );
    return result.rows[0];
  }

  static async getUpcomingTerm(institutionId) {
    const result = await db.query(`
      SELECT * FROM academic_terms
      WHERE institution_id = $1
        AND start_date > CURRENT_DATE
      ORDER BY start_date ASC
      LIMIT 1
    `, [institutionId]);
    return result.rows[0];
  }
}

module.exports = AcademicTerm;
