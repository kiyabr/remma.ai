import * as React from 'react';

export const WaitlistEmail = ({ email }) => (
  <div style={{
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    backgroundColor: '#0a0a0a',
    color: '#ffffff',
    padding: '40px 20px',
    borderRadius: '12px',
    maxWidth: '600px',
    margin: '0 auto',
    border: '1px solid #222222'
  }}>
    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
      <h1 style={{ color: '#16a34a', fontSize: '24px', margin: '0' }}>REMMA.</h1>
      <p style={{ color: '#a1a1aa', fontSize: '14px' }}>AI Video Summaries, Refined.</p>
    </div>
    
    <div style={{ padding: '20px', backgroundColor: '#111111', borderRadius: '8px', border: '1px solid #333' }}>
      <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>You're on the list! 🎉</h2>
      <p style={{ lineHeight: '1.6', color: '#e5e5e5' }}>
        Thank you for joining the Remma AI waitlist. We're excited to have you as one of our early testers!
      </p>
      <p style={{ lineHeight: '1.6', color: '#e5e5e5' }}>
        We are currently in a limited beta to ensure the best experience for everyone. We'll send you an invite as soon as a spot opens up for you.
      </p>
      
      <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #333' }}>
        <p style={{ fontSize: '12px', color: '#71717a' }}>
          Registered email: <strong>{email}</strong>
        </p>
      </div>
    </div>

    <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '12px', color: '#71717a' }}>
      <p>© 2026 Remma AI. All rights reserved.</p>
      <p>Building the future of video consumption.</p>
    </div>
  </div>
);

export default WaitlistEmail;
