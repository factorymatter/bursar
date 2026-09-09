import { useState, useEffect } from 'react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav id="main-nav" className={isScrolled ? 'scrolled' : ''}>
        <a href="#" className="nav-logo">
          <div className="nav-logo-icon">🎓</div>
          <div className="nav-logo-text">Bur<span>sar</span></div>
        </a>
        <ul className="nav-links">
          <li><a href="#how-it-works">How It Works</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#integrations">Integrations</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>
        <div className="nav-ctas">
          <a href="#pilot" className="btn btn-ghost">Request Demo</a>
          <a href="#pilot" className="btn btn-primary">Get Started →</a>
        </div>
        <div className="hamburger" onClick={toggleMobileMenu}>
          <span></span><span></span><span></span>
        </div>
      </nav>

      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`} id="mobile-menu">
        <a href="#how-it-works" onClick={closeMobileMenu}>How It Works</a>
        <a href="#features" onClick={closeMobileMenu}>Features</a>
        <a href="#integrations" onClick={closeMobileMenu}>Integrations</a>
        <a href="#pricing" onClick={closeMobileMenu}>Pricing</a>
        <a href="#faq" onClick={closeMobileMenu}>FAQ</a>
        <a href="#pilot" onClick={closeMobileMenu} className="btn btn-primary btn-lg" style={{ textAlign: 'center', marginTop: '12px' }}>Request Pilot →</a>
      </div>
    </>
  );
}
