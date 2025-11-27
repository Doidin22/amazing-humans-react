import React from 'react';

export default function Privacy() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h2 style={{ borderBottom: '3px solid #4a90e2', paddingBottom: '10px', marginBottom: '30px', color: 'white' }}>Privacy Policy</h2>
      
      <div style={{ background: '#1f1f1f', padding: '40px', borderRadius: '10px', border: '1px solid #333', color: '#ccc', lineHeight: '1.8' }}>
          <p>Last Updated: November 2025</p>

          <h3 style={{ color: '#4a90e2', marginTop: '30px', marginBottom: '10px' }}>1. Information We Collect</h3>
          <p>When you register through Google, we collect your name, email address, and profile picture to create your account.</p>

          <h3 style={{ color: '#4a90e2', marginTop: '30px', marginBottom: '10px' }}>2. How We Use Your Information</h3>
          <p>We use your information to:</p>
          <ul style={{ marginLeft: '20px', marginBottom: '20px' }}>
              <li>Provide and maintain the service.</li>
              <li>Allow you to publish and comment on stories.</li>
              <li>Notify you about interactions (comments, follows).</li>
          </ul>

          <h3 style={{ color: '#4a90e2', marginTop: '30px', marginBottom: '10px' }}>3. Data Security</h3>
          <p>We implement security measures to maintain the safety of your personal information using Firebase secure infrastructure.</p>
      </div>
    </div>
  );
}