import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="rr-card skeleton-card">
      {/* Capa Falsa */}
      <div className="skeleton skeleton-cover"></div>
      
      {/* Avaliação Falsa */}
      <div className="skeleton skeleton-text" style={{ width: '40%' }}></div>
      
      {/* Título Falso */}
      <div className="skeleton skeleton-text" style={{ width: '90%', height: '0.9rem' }}></div>
      <div className="skeleton skeleton-text" style={{ width: '60%', height: '0.9rem' }}></div>
      
      {/* Tag Falsa */}
      <div className="skeleton skeleton-text" style={{ width: '30%', marginTop: 'auto' }}></div>
    </div>
  );
}