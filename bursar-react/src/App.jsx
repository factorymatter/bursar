import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TrustBar from './components/TrustBar';
import Problem from './components/Problem';
import HowItWorks from './components/HowItWorks';
import Scenarios from './components/Scenarios';
import Features from './components/Features';
import Integrations from './components/Integrations';
import Metrics from './components/Metrics';
import Market from './components/Market';
import Testimonials from './components/Testimonials';
import Pricing from './components/Pricing';
import PilotForm from './components/PilotForm';
import FAQ from './components/FAQ';
import CTASection from './components/CTASection';
import Footer from './components/Footer';

// Import the notification bar component inline
function NotifyBar() {
  return (
    <div className="notify-bar">
      <span>🚀 NEW</span> Bursar now integrates with Ellucian Banner & Jenzabar EX — request your pilot today
    </div>
  );
}

function App() {
  useEffect(() => {
    // Intersection Observer for fade-in animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
        }
      });
    }, { threshold: 0.12 });

    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(el => observer.observe(el));

    return () => {
      fadeElements.forEach(el => observer.unobserve(el));
    };
  }, []);

  return (
    <>
      <NotifyBar />
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <Problem />
        <HowItWorks />
        <Scenarios />
        <Features />
        <Integrations />
        <Metrics />
        <Market />
        <Testimonials />
        <Pricing />
        <section className="pilot" id="pilot">
          <div className="section-inner">
            <div className="pilot-inner">
              <div className="fade-in">
                <div className="section-badge">🚀 Get Started</div>
                <h2 className="section-title">Start Your Free <span style={{ color: '#fcd34d' }}>Pilot</span></h2>
                <p className="section-sub" style={{ marginBottom: '36px' }}>
                  We partner with 2 community colleges each quarter for a fully-supported, no-cost pilot. We'll integrate with your SIS, configure your rules, and document every prevented dropout.
                </p>
                <div className="pilot-checklist">
                  <div className="pilot-check-item">
                    <div className="pilot-check-icon">⚡</div>
                    <div>
                      <div className="pilot-check-title">Live in under 1 week</div>
                      <div className="pilot-check-desc">Our integration team handles the full SIS connection and configuration. Your IT team spends less than 4 hours.</div>
                    </div>
                  </div>
                  <div className="pilot-check-item">
                    <div className="pilot-check-icon">📊</div>
                    <div>
                      <div className="pilot-check-title">Case studies documented</div>
                      <div className="pilot-check-desc">We capture every intervention during the pilot and produce a semester-end report with ROI calculations for your board.</div>
                    </div>
                  </div>
                  <div className="pilot-check-item">
                    <div className="pilot-check-icon">🤝</div>
                    <div>
                      <div className="pilot-check-title">Dedicated support</div>
                      <div className="pilot-check-desc">A Customer Success Manager is assigned to your institution for the full pilot. Weekly check-ins and immediate escalation paths.</div>
                    </div>
                  </div>
                  <div className="pilot-check-item">
                    <div className="pilot-check-icon">🔒</div>
                    <div>
                      <div className="pilot-check-title">No commitment required</div>
                      <div className="pilot-check-desc">The pilot is free. If Bursar doesn't demonstrate clear value within one semester, you owe nothing and we help you wind down cleanly.</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="fade-in" style={{ transitionDelay: '.15s' }}>
                <PilotForm />
              </div>
            </div>
          </div>
        </section>
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}

export default App;
