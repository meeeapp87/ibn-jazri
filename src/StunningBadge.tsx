/**
 * Stunning Badge Component
 * Shows "Made with Stunning" badge in bottom-left corner for FREE tier users
 */

export function StunningBadge() {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
    >
      <a
        href="https://stunning.so"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #FAFAFA 100%)',
          padding: '10px 14px',
          borderRadius: '50px',
          textDecoration: 'none',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(229, 231, 235, 0.8)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '13px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(121, 74, 255, 0.15), 0 4px 8px rgba(0, 0, 0, 0.08)';
          e.currentTarget.style.border = '1px solid rgba(121, 74, 255, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)';
          e.currentTarget.style.border = '1px solid rgba(229, 231, 235, 0.8)';
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 1px 2px rgba(121, 74, 255, 0.1)',
            flexShrink: 0,
          }}
        >
          <img
            src="/images/Stunning-logo-animated.gif"
            alt="Stunning"
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              objectFit: 'contain',
            }}
          />
        </div>
        <span style={{ color: '#374151', letterSpacing: '0.01em' }}>
          Made with{' '}
          <strong
            style={{
              background: 'linear-gradient(135deg, #794AFF 0%, #B544EB 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: '600',
            }}
          >
            Stunning
          </strong>
        </span>
      </a>
    </div>
  );
}
