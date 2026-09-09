const testimonials = [
  {
    stars: '★★★★★',
    quote: "We used to get 30–40 panicked emails a month from students who didn't realize dropping a class affected their Pell. That number dropped to 6 in our first semester with Bursar. It's remarkable.",
    name: 'Sandra M.',
    role: 'Director of Financial Aid, Central Valley CC',
    bgGradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    avatar: '👩‍💼'
  },
  {
    stars: '★★★★★',
    quote: "The SAP appeal automation alone is worth the cost. Students who would have given up now have a guided path forward. We've seen a measurable uptick in re-enrollment from SAP warning students.",
    name: 'Marcus T.',
    role: 'Academic Dean, North Shore Community College',
    bgGradient: 'linear-gradient(135deg,#0891b2,#06b6d4)',
    avatar: '👨‍🏫'
  },
  {
    stars: '★★★★★',
    quote: "Bursar paid for itself in the first month. One prevented dropout represents $6,000+ in tuition revenue and a student whose life stayed on track. At $4/learner, it's the easiest budget line I've ever approved.",
    name: 'Dr. Karen W.',
    role: 'VP of Student Affairs, Riverside CC District',
    bgGradient: 'linear-gradient(135deg,#059669,#10b981)',
    avatar: '👩‍💻'
  }
];

export default function Testimonials() {
  return (
    <section style={{ background: 'var(--bg)' }}>
      <div className="section-inner">
        <div className="text-center fade-in">
          <div className="section-badge">💬 What Advisors Say</div>
          <h2 className="section-title">Trusted by Financial Aid <span>Professionals</span></h2>
          <p className="section-sub">Pilot participants from two-year institutions share what changed in their first semester with Bursar.</p>
        </div>
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div key={index} className={`testimonial-card fade-in`} style={{ transitionDelay: (index * 0.08) + 's' }}>
              <div className="testimonial-stars">{testimonial.stars}</div>
              <div className="testimonial-quote">"{testimonial.quote}"</div>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background: testimonial.bgGradient }}>{testimonial.avatar}</div>
                <div>
                  <div className="testimonial-name">{testimonial.name}</div>
                  <div className="testimonial-role">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
