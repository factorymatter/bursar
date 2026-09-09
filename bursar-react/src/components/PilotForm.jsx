import { useState } from 'react';

export default function PilotForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    institution: '',
    role: '',
    enrollmentSize: '',
    sis: '',
    challenge: ''
  });

  const [showToast, setShowToast] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically send the data to a backend
    console.log('Pilot request submitted:', formData);
    setShowToast(true);
    // Reset form
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      institution: '',
      role: '',
      enrollmentSize: '',
      sis: '',
      challenge: ''
    });
    setTimeout(() => setShowToast(false), 4000);
  };

  return (
    <>
      <div className="pilot-form">
        <h3>🎓 Request a Pilot Slot</h3>
        <div className="form-row">
          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              name="firstName"
              placeholder="Sarah"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              name="lastName"
              placeholder="Reyes"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label>Work Email</label>
          <input
            type="email"
            name="email"
            placeholder="sarah@college.edu"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Institution Name</label>
          <input
            type="text"
            name="institution"
            placeholder="Central Valley Community College"
            value={formData.institution}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Your Role</label>
          <select name="role" value={formData.role} onChange={handleChange} required>
            <option value="">Select your role...</option>
            <option value="Director of Financial Aid">Director of Financial Aid</option>
            <option value="VP of Student Affairs">VP of Student Affairs</option>
            <option value="Academic Dean">Academic Dean</option>
            <option value="Chief Information Officer">Chief Information Officer</option>
            <option value="Registrar">Registrar</option>
            <option value="President / CEO">President / CEO</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label>Student Enrollment Size</label>
          <select name="enrollmentSize" value={formData.enrollmentSize} onChange={handleChange} required>
            <option value="">Select size...</option>
            <option value="Under 2,000 students">Under 2,000 students</option>
            <option value="2,000 – 5,000 students">2,000 – 5,000 students</option>
            <option value="5,000 – 10,000 students">5,000 – 10,000 students</option>
            <option value="10,000 – 25,000 students">10,000 – 25,000 students</option>
            <option value="25,000+ students">25,000+ students</option>
          </select>
        </div>
        <div className="form-group">
          <label>Current Student Information System</label>
          <select name="sis" value={formData.sis} onChange={handleChange} required>
            <option value="">Select your SIS...</option>
            <option value="Ellucian Banner">Ellucian Banner</option>
            <option value="Jenzabar EX / J1">Jenzabar EX / J1</option>
            <option value="PeopleSoft Campus Solutions">PeopleSoft Campus Solutions</option>
            <option value="Workday Student">Workday Student</option>
            <option value="Anthology / Colleague">Anthology / Colleague</option>
            <option value="Other / Custom">Other / Custom</option>
          </select>
        </div>
        <div className="form-group">
          <label>What's your biggest financial aid challenge? (optional)</label>
          <textarea
            name="challenge"
            placeholder="e.g. Students dropping classes without knowing the impact on Pell..."
            value={formData.challenge}
            onChange={handleChange}
          />
        </div>
        <button className="btn btn-accent btn-lg" style={{ width: '100%', justifyContent: 'center', fontSize: '1rem' }} onClick={handleSubmit}>
          🚀 Request My Pilot Slot →
        </button>
        <div style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.4)', textAlign: 'center', marginTop: '12px' }}>
          We'll respond within 1 business day. No spam, ever.
        </div>
      </div>
      {showToast && (
        <div
          id="toast"
          style={{
            position: 'fixed',
            bottom: '32px',
            right: '32px',
            background: '#10b981',
            color: '#fff',
            padding: '16px 24px',
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '.9rem',
            boxShadow: '0 8px 32px rgba(0,0,0,.2)',
            transform: 'translateY(0)',
            opacity: 1,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          ✓ Pilot request received! We'll be in touch within 1 business day.
        </div>
      )}
    </>
  );
}
