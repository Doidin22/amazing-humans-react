import React from 'react';
import { Link } from 'react-router-dom';
import { FaHeart, FaTwitter, FaGithub, FaInstagram, FaCoffee } from 'react-icons/fa';

export default function Footer() {
  // Função para rolar para o topo sempre que clicar num link
  const handleScrollTop = () => {
    window.scrollTo(0, 0);
  };

  return (
    <footer style={{ 
        backgroundColor: '#1f1f1f', 
        borderTop: '1px solid #333', 
        padding: '40px 20px', 
        marginTop: 'auto', 
        color: '#ccc',
        fontSize: '0.9rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px' }}>
        
        {/* COLUNA 1: MARCA E SLOGAN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ color: '#4a90e2', margin: 0, fontSize: '1.2rem' }}>AMAZING HUMANS</h3>
            <p style={{ margin: 0, color: '#888', fontStyle: 'italic' }}>
                Built for writers & readers. <br/>Share your imagination with the world.
            </p>
            <p style={{ marginTop: 10, fontSize: '0.8rem' }}>
                © {new Date().getFullYear()} AmazingHumans. All rights reserved.
            </p>
        </div>

        {/* COLUNA 2: LINKS ÚTEIS (Com Scroll Top) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ color: 'white', margin: '0 0 10px 0' }}>Platform</h4>
            
            <Link to="/" onClick={handleScrollTop} style={{ color: '#aaa', textDecoration: 'none' }}>Home</Link>
            <Link to="/biblioteca" onClick={handleScrollTop} style={{ color: '#aaa', textDecoration: 'none' }}>My Library</Link>
            <Link to="/escrever" onClick={handleScrollTop} style={{ color: '#aaa', textDecoration: 'none' }}>Start Writing</Link>
            
            {/* Links corrigidos para Termos e Privacidade */}
            <Link to="/terms" onClick={handleScrollTop} style={{ color: '#aaa', textDecoration: 'none' }}>Terms of Service</Link>
            <Link to="/privacy" onClick={handleScrollTop} style={{ color: '#aaa', textDecoration: 'none' }}>Privacy Policy</Link>
        </div>

        {/* COLUNA 3: COMUNIDADE E SUPORTE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h4 style={{ color: 'white', margin: 0 }}>Community</h4>
            
            {/* Ícones Sociais */}
            <div style={{ display: 'flex', gap: '15px' }}>
                <a href="#" style={{ color: '#ccc', fontSize: '1.2rem' }}><FaTwitter /></a>
                <a href="#" style={{ color: '#ccc', fontSize: '1.2rem' }}><FaInstagram /></a>
                <a href="#" style={{ color: '#ccc', fontSize: '1.2rem' }}><FaGithub /></a>
            </div>

            {/* Botão Donate */}
            <a 
                href="https://buymeacoffee.com/rlokin222" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    background: '#d9a404', 
                    color: '#000', 
                    padding: '10px 15px', 
                    borderRadius: '20px', 
                    textDecoration: 'none', 
                    fontWeight: 'bold',
                    width: 'fit-content'
                }}
            >
                <FaCoffee /> Donate to Server
            </a>
        </div>

      </div>

      <div style={{ textAlign: 'center', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #333', fontSize: '0.8rem', color: '#666' }}>
          Made with <FaHeart style={{ color: '#d9534f', verticalAlign: 'middle' }} /> by AmazingHumans Team
      </div>
    </footer>
  );
}