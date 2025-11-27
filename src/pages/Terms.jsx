import React from 'react';

export default function Terms() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h2 style={{ borderBottom: '3px solid #4a90e2', paddingBottom: '10px', marginBottom: '30px', color: 'white' }}>Terms of Service</h2>
      
      <div style={{ background: '#1f1f1f', padding: '40px', borderRadius: '10px', border: '1px solid #333', color: '#ccc', lineHeight: '1.8' }}>
          <p>Last Updated: November 2025</p>

          <h3 style={{ color: '#4a90e2', marginTop: '30px', marginBottom: '10px' }}>1. Acceptance of Terms</h3>
          <p>By accessing and using AmazingHumans, you accept and agree to be bound by the terms and provision of this agreement.</p>

          <h3 style={{ color: '#4a90e2', marginTop: '30px', marginBottom: '10px' }}>2. User Content & Copyright</h3>
          <p>Authors retain all ownership rights to the content they publish on AmazingHumans. By posting content, you grant us a non-exclusive license to display, distribute, and promote your work on this platform.</p>
          <ul style={{ marginLeft: '20px', marginBottom: '20px' }}>
              <li>You must own the rights to the stories you publish.</li>
              <li>Plagiarism will result in an immediate ban.</li>
              <li>We do not claim ownership over your intellectual property.</li>
          </ul>

          <h3 style={{ color: '#4a90e2', marginTop: '30px', marginBottom: '10px' }}>3. Community Guidelines</h3>
          <p>We want to build a positive community. The following actions are prohibited:</p>
          <ul style={{ marginLeft: '20px', marginBottom: '20px' }}>
              <li>Harassment, hate speech, or bullying in comments.</li>
              <li>Spamming or advertising other services excessively.</li>
              <li>Posting illegal content.</li>
          </ul>

          <h3 style={{ color: '#4a90e2', marginTop: '30px', marginBottom: '10px' }}>4. Disclaimer</h3>
          <p>AmazingHumans is provided "as is". We do not guarantee that the service will be uninterrupted or error-free. Authors are highly encouraged to keep local backups of their work.</p>

          <h3 style={{ color: '#4a90e2', marginTop: '30px', marginBottom: '10px' }}>5. Termination</h3>
          <p>We reserve the right to terminate or suspend access to our service immediately, without prior notice, for conduct that we believe violates these Terms.</p>
      </div>
    </div>
  );
}