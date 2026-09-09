const db = require('../config/database');

class AdvisorAssignment {
  static async findByStudent(studentId) {
    const result = await db.query(`
      SELECT a.*, ad.first_name as advisor_first_name, ad.last_name as advisor_last_name,
             ad.email as advisor_email, ad.title as advisor_title
      FROM advisor_assignments a
      JOIN advisors ad ON a.advisor_id = ad.id
      WHERE a.student_id = $1 AND a.status = 'active'
      ORDER BY a.assigned_at DESC
      LIMIT 1
    `, [studentId]);
    return result.rows[0];
  }

  static async findByAdvisor(advisorId, status = null) {
    let query = `
      SELECT a.*, s.first_name as student_first_name, s.last_name as student_last_name,
             s.email as student_email, s.sis_student_id
      FROM advisor_assignments a
      JOIN students s ON a.student_id = s.id
      WHERE a.advisor_id = $1
    `;
    const params = [advisorId];

    if (status) {
      query += ` AND a.status = $2`;
      params.push(status);
    }

    query += ' ORDER BY a.assigned_at DESC';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async create(data) {
    const {
      student_id,
      advisor_id,
      institution_id,
      assigned_by,
      reason,
      notes,
      assignment_type
    } = data;

    // Check for existing active assignment and deactivate it
    await db.query(
      'UPDATE advisor_assignments SET status = $1 WHERE student_id = $2 AND status = $3',
      ['completed', student_id, 'active']
    );

    const result = await db.query(
      `INSERT INTO advisor_assignments (
        student_id, advisor_id, institution_id, assigned_by, reason, notes, assignment_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        student_id, advisor_id, institution_id, assigned_by, reason,
        notes || '', assignment_type || 'manual'
      ]
    );
    return result.rows[0];
  }

  static async updateStatus(assignmentId, status) {
    const result = await db.query(
      'UPDATE advisor_assignments SET status = $1 WHERE id = $2 RETURNING *',
      [status, assignmentId]
    );
    return result.rows[0];
  }

  static async getAssignmentHistory(studentId) {
    const result = await db.query(`
      SELECT a.*, ad.first_name as advisor_first_name, ad.last_name as advisor_last_name
      FROM advisor_assignments a
      JOIN advisors ad ON a.advisor_id = ad.id
      WHERE a.student_id = $1
      ORDER BY a.assigned_at DESC
    `, [studentId]);
    return result.rows;
  }
}

module.exports = AdvisorAssignment;
