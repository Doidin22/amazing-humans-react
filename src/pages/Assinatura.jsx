import React from 'react';
import { MdDiamond } from 'react-icons/md';

export default function Assinatura() {
  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '20px', textAlign: 'center' }}>
      <MdDiamond size={60} color="#333" style={{ marginBottom: 20 }} />
      <h1 style={{ color: 'white', fontSize: '2rem', margin: '0 0 10px 0' }}>Premium Features</h1>
      <p style={{ color: '#777', fontSize: '1.1rem' }}>
        We are currently updating our subscription plans. <br />
        All books are free to read for now! Enjoy.
      </p>
    </div>
  );
}