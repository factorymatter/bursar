const timelineItems = [
  {
    label: 'Student drops a course',
    desc: 'Unaware that falling below 12 credits changes their Pell Grant status from full-time to half-time.',
    isWarning: false
  },
  {
    label: 'Aid office recalculates (weeks later)',
    desc: 'The financial aid package is quietly revised. No immediate notification reaches the student.',
    isWarning: true
  },
  {
    label: 'Bill arrives — student is shocked',
    desc: 'A balance due of $800–$2,000 appears. The student can\'t pay. They stop attending classes.',
    isWarning: true
  },
  {
    label: 'Student drops out',
    desc: 'One avoidable enrollment decision ends an academic career — and costs the institution a retention data point.',
    isWarning: false
  }
];

const problemCards = [
  {
    icon: '💸',
    title: 'Credit-Hour Thresholds',
    body: 'Full-time (12+ credits), half-time (6–11), and less-than-half-time each trigger different aid amounts. Students rarely know these thresholds before changing their schedule.'
  },
  {
    icon: '📅',
    title: 'Withdrawal Timing Windows',
    body: 'Federal Return-to-Title-IV rules mean withdrawing before 60% of a term is completed triggers repayment calculations. Add/drop deadlines and census dates add another layer of complexity.'
  },
  {
    icon: '📊',
    title: 'Satisfactory Academic Progress',
    body: 'SAP evaluates GPA, completion rate, and maximum time frame each semester. A single F or W can push a student below federal thresholds, making them ineligible for future aid.'
  },
  {
    icon: '🏛️',
    title: 'Siloed Departments',
    body: 'Registrar, Financial Aid, and Bursar operate in separate systems. Schedule changes and financial fallout land in different departments at different times — by then it\'s too late.'
  }
];

export default function Problem() {
  return (
    <section className="problem" id="problem">
      <div className="section-inner">
        <div className="problem-grid">
          <div className="fade-in">
            <div className="section-badge">📍 The Problem</div>
            <h2 className="section-title">Students Lose Aid <span>Without Warning</span></h2>
            <p className="section-sub" style={{ marginBottom: '36px' }}>
              Community college students operate on razor-thin margins. A single enrollment mistake — dropping one class, switching to part-time, or missing a SAP deadline — triggers grant recalculation that surfaces weeks later as a surprise bill.
            </p>
            <div className="timeline">
              {timelineItems.map((item, index) => (
                <div key={index} className="timeline-item">
                  <div className="timeline-line">
                    <div className={`timeline-dot ${item.isWarning ? 'warn' : ''}`}></div>
                    {index < timelineItems.length - 1 && <div className="timeline-connector"></div>}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-label">{item.label}</div>
                    <div className="timeline-desc">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="fade-in" style={{ transitionDelay: '.15s' }}>
            <div className="problem-cards">
              {problemCards.map((card, index) => (
                <div key={index} className="problem-card">
                  <div className="problem-card-icon">{card.icon}</div>
                  <div className="problem-card-title">{card.title}</div>
                  <div className="problem-card-body">{card.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
