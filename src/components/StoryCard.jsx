import React from 'react';
import { Link } from 'react-router-dom';
import { MdStar } from 'react-icons/md';

// Este componente recebe os dados de "data" (o livro)
export default function StoryCard({ data }) {
  // Se tiver capa, mostra a imagem. Se não, mostra o placeholder colorido.
  const temCapa = data.capa && data.capa.length > 5;

  return (
    <Link to={`/obra/${data.id}`} className="rr-card" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
      
      {/* Área da Imagem */}
      {temCapa ? (
        <img 
          src={data.capa} 
          alt={data.titulo} 
          style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px' }}
          onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} 
        />
      ) : null}

      {/* Placeholder (aparece se não tiver capa ou se a imagem falhar) */}
      <div 
        className="cover-placeholder" 
        style={{ 
          display: temCapa ? 'none' : 'flex', 
          height: '200px', 
          width: '100%',
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#333',
          color: '#555',
          fontSize: '3rem',
          borderRadius: '4px',
          marginBottom: '8px'
        }}
      >
        {data.titulo ? data.titulo.charAt(0) : '?'}
      </div>

      {/* Informações */}
      <div style={{ color: '#ffd700', fontSize: '0.8rem', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <MdStar /> {(data.rating || 0).toFixed(1)}
      </div>
      
      <h4 style={{ fontSize: '0.9rem', color: 'white', marginBottom: '5px', margin: 0, lineHeight: '1.4' }}>
        {data.titulo}
      </h4>

      <span className="rr-tag" style={{ alignSelf: 'flex-start', marginTop: 'auto' }}>
        {data.categorias && data.categorias[0] ? data.categorias[0] : 'Story'}
      </span>

    </Link>
  );
}