export default function Toast({ show }) {
  if (!show) return null;

  return (
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
  );
}
