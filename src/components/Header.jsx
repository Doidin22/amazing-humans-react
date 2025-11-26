import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore'; 
import { Link } from 'react-router-dom';
import { 
  MdMenu, MdNotifications, MdPerson, MdEditNote, 
  MdBookmarks, MdHistory, MdLogout, MdArrowDropDown,
  MdHome, MdClose 
} from 'react-icons/md';

export default function Header() {
  const { signed, user, signInGoogle, logout } = useContext(AuthContext);
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [notifCount, setNotifCount] = useState(0); 

  const toggleDropdown = () => setShowDropdown(!showDropdown);
  const toggleDrawer = () => setShowDrawer(!showDrawer);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
        collection(db, "notificacoes"), 
        where("paraId", "==", user.uid), 
        where("lida", "==", false),
        limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        setNotifCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <>
      {/* --- MOBILE DRAWER --- */}
      <div 
        className={`drawer-overlay ${showDrawer ? 'open' : ''}`} 
        onClick={() => setShowDrawer(false)}
      ></div>

      <div className={`mobile-nav-drawer ${showDrawer ? 'open' : ''}`} id="mobileDrawer">
          <div style={{ alignSelf: 'flex-end', padding: '10px' }}>
             <MdClose size={28} color="white" onClick={() => setShowDrawer(false)} style={{ cursor: 'pointer' }} />
          </div>

          {signed ? (
            <>
                <div className="user-info-drawer" onClick={() => setShowDrawer(false)} style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                    <img src={user.avatar} alt="Avatar" style={{ width:40, height:40, borderRadius:'50%', border:'2px solid #4a90e2', marginRight:10 }} /> 
                    <span style={{ color: 'white', fontWeight: 'bold' }}>{user.name}</span>
                </div>
                
                <Link to="/" onClick={() => setShowDrawer(false)} style={{ color: 'white', textDecoration: 'none', padding: '15px 0', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MdHome size={24} /> Home
                </Link>

                <Link to="/notificacoes" onClick={() => setShowDrawer(false)} style={{ color: 'white', textDecoration: 'none', padding: '15px 0', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ position: 'relative', display: 'flex' }}>
                        <MdNotifications size={24} />
                        {notifCount > 0 && (
                            <span style={{ position: 'absolute', top: -2, right: -2, background: 'red', width: 8, height: 8, borderRadius: '50%' }}></span>
                        )}
                    </div>
                    Notifications {notifCount > 0 && <span style={{ background: 'red', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem', marginLeft: 'auto' }}>{notifCount}</span>}
                </Link>

                <Link to="/perfil" onClick={() => setShowDrawer(false)} style={{ color: 'white', textDecoration: 'none', padding: '15px 0', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MdPerson size={24} /> My Profile
                </Link>
                <Link to="/biblioteca" onClick={() => setShowDrawer(false)} style={{ color: 'white', textDecoration: 'none', padding: '15px 0', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MdBookmarks size={24} /> Library
                </Link>
                <Link to="/dashboard" onClick={() => setShowDrawer(false)} style={{ color: 'white', textDecoration: 'none', padding: '15px 0', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MdEditNote size={24} /> Dashboard
                </Link>
                
                <button 
                    onClick={() => { logout(); setShowDrawer(false); }} 
                    style={{ background: '#d9534f', color: 'white', border: 'none', padding: '10px', marginTop: 20, borderRadius: 5, fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
                >
                    Logout
                </button>
            </>
          ) : (
            <>
                <h3 style={{ color: 'white', textAlign: 'center', marginTop: 10, marginBottom: 20 }}>Welcome!</h3>
                <Link to="/" onClick={() => setShowDrawer(false)} style={{ color: 'white', textDecoration: 'none', padding: '15px 0', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MdHome size={24} /> Home
                </Link>
                <button 
                    onClick={() => { signInGoogle(); setShowDrawer(false); }} 
                    className="btn-google" 
                    style={{ marginTop: 20, width: '100%' }}
                >
                    Login
                </button>
            </>
          )}
      </div>

      {/* --- DESKTOP HEADER --- */}
      <header>
         <button 
            id="menuToggleBtn" 
            onClick={toggleDrawer} 
            style={{background:'none', border:'none', color:'white', cursor:'pointer'}}
         >
           <div style={{ position: 'relative' }}>
             <MdMenu size={32} />
             {notifCount > 0 && <span style={{ position: 'absolute', top: 0, right: 0, background: 'red', width: 10, height: 10, borderRadius: '50%', border: '2px solid #1f1f1f' }}></span>}
           </div>
         </button>

         <div className="logo">
           <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#4a90e2', fontWeight: 'bold', fontSize: '1.3rem' }}>
              {/* ADICIONAMOS A IMAGEM DA LOGO AQUI */}
              <img src="/logo-ah.png" alt="Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
              AMAZING HUMANS
           </Link>
         </div>

         <div className="user-area">
           {!signed ? (
             <button onClick={signInGoogle} className="btn-google">Login</button>
           ) : (
             <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
               
               <Link to="/notificacoes" style={{ color: '#ccc', display: 'flex', alignItems: 'center', position: 'relative' }}>
                 <MdNotifications size={24} />
                 {notifCount > 0 && (
                     <span style={{ 
                         position: 'absolute', 
                         top: -5, 
                         right: -5, 
                         background: 'red', 
                         color: 'white', 
                         fontSize: '0.6rem', 
                         padding: '2px 5px', 
                         borderRadius: '50%',
                         fontWeight: 'bold'
                     }}>
                         {notifCount > 20 ? '20+' : notifCount}
                     </span>
                 )}
               </Link>

               <div className="user-menu-trigger" onClick={toggleDropdown} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                 <img src={user.avatar} alt="Avatar" className="header-avatar" />
                 <span className="hide-mobile" style={{ fontWeight: 'bold', color: '#ddd' }}>{user.name}</span>
                 <MdArrowDropDown size={24} className="hide-mobile" />
               </div>

               <div className={`dropdown-box ${showDropdown ? 'active' : ''}`} onMouseLeave={() => setShowDropdown(false)}>
                  <div style={{ padding: '10px 20px', borderBottom: '1px solid #333', marginBottom: '5px' }}>
                      <strong style={{ color: 'white' }}>{user.name}</strong>
                  </div>
                  <Link to="/perfil" className="dropdown-item"><MdPerson /> My Profile</Link>
                  <Link to="/dashboard" className="dropdown-item"><MdEditNote /> Dashboard</Link>
                  <div className="dropdown-divider"></div>
                  <Link to="/biblioteca" className="dropdown-item"><MdBookmarks /> Library</Link>
                  <Link to="/historico" className="dropdown-item"><MdHistory /> History</Link>
                  <button onClick={logout} className="dropdown-item" style={{ color: '#d9534f' }}>
                    <MdLogout /> Logout
                  </button>
               </div>
             </div>
           )}
         </div>
      </header>
    </>
  );
}