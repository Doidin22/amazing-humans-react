import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore'; 
import { Link } from 'react-router-dom';
import { 
  MdMenu, MdNotifications, MdPerson, MdEditNote, 
  MdBookmarks, MdLogout, MdArrowDropDown,
  MdHome, MdClose, MdLogin, MdHistory, MdInfoOutline, MdPhoneIphone, MdSecurity 
} from 'react-icons/md';
import { FaCoffee } from 'react-icons/fa';
import GamificationBar from './GamificationBar'; // <--- IMPORT

export default function Header() {
  const { signed, user, logout, isAdmin } = useContext(AuthContext);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [notifCount, setNotifCount] = useState(0); 
  const [scrolled, setScrolled] = useState(false);

  const toggleDropdown = () => setShowDropdown(!showDropdown);
  const toggleDrawer = () => setShowDrawer(!showDrawer);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "notificacoes"), where("paraId", "==", user.uid), where("lida", "==", false), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => setNotifCount(snapshot.size));
    return () => unsubscribe();
  }, [user]);

  const getAvatarUrl = () => {
    if (user?.avatar) return user.avatar;
    return `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`;
  };

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`;
  };

  const handleDownloadApp = () => {
      // Como agora é PWA, o navegador já deve oferecer a instalação, 
      // mas podemos mostrar um alerta ensinando.
      alert("To install the app: Tap 'Share' > 'Add to Home Screen' (iOS) or click 'Install' in your browser menu (Android/PC).");
  };

  return (
    <>
      {/* --- MENU MOBILE (DRAWER) --- */}
      {showDrawer && (
        <div className="fixed inset-0 bg-black/80 z-[1000] backdrop-blur-sm" onClick={() => setShowDrawer(false)}></div>
      )}

      <div className={`fixed top-0 left-0 h-full w-72 bg-[#1a1a1a] shadow-2xl z-[1001] transform transition-transform duration-300 ease-in-out overflow-y-auto border-r border-white/5 ${showDrawer ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex justify-end p-4">
             <MdClose size={28} className="text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={() => setShowDrawer(false)} />
          </div>

          <div className="flex flex-col gap-2 p-4 pb-20">
              
              {/* GAMIFICAÇÃO MOBILE */}
              {signed && <GamificationBar mobile={true} />}

              <a 
                  href="https://buymeacoffee.com/rlokin222" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mb-4 w-full bg-[#FFDD00] hover:bg-[#ffea00] text-black py-3 rounded-lg font-bold text-sm transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                  <FaCoffee /> Support Author
              </a>

              <div className="mb-6 bg-blue-600/10 border border-blue-500/30 rounded-xl p-4">
                  <h4 className="text-blue-400 font-bold flex items-center gap-2 mb-2 text-sm">
                      <MdPhoneIphone /> Install App
                  </h4>
                  <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                      Install Amazing Humans on your device for a better reading experience.
                  </p>
                  <button 
                      onClick={handleDownloadApp}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-bold text-xs transition-colors shadow-lg"
                  >
                      Install Now
                  </button>
              </div>

              {signed ? (
                <>
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-700">
                        <img 
                            src={getAvatarUrl()} 
                            onError={handleImageError}
                            alt="Avatar" 
                            className="w-10 h-10 rounded-full border border-blue-500 object-cover" 
                        /> 
                        <div className="overflow-hidden">
                            <p className="text-white font-bold truncate text-sm">{user.name}</p>
                            <p className="text-gray-500 text-xs truncate">Lvl {user.nivel}</p>
                        </div>
                    </div>
                    
                    {isAdmin && isAdmin() && (
                        <Link to="/admin" onClick={() => setShowDrawer(false)} className="flex items-center gap-3 text-red-400 py-3 hover:text-white border-b border-white/5 transition-colors font-bold">
                            <MdSecurity size={22} /> Admin Panel
                        </Link>
                    )}

                    <Link to="/" onClick={() => setShowDrawer(false)} className="flex items-center gap-3 text-gray-300 py-3 hover:text-white border-b border-white/5 transition-colors">
                        <MdHome size={22} /> Home
                    </Link>

                    <Link to="/how-it-works" onClick={() => setShowDrawer(false)} className="flex items-center gap-3 text-gray-300 py-3 hover:text-white border-b border-white/5 transition-colors">
                        <MdInfoOutline size={22} /> How it Works
                    </Link>
                    
                    <Link to="/notificacoes" onClick={() => setShowDrawer(false)} className="flex items-center gap-3 text-gray-300 py-3 hover:text-white border-b border-white/5 transition-colors">
                        <MdNotifications size={22} /> Notifications
                        {notifCount > 0 && <span className="bg-red-500 text-white text-xs px-2 rounded-full ml-auto">{notifCount}</span>}
                    </Link>
                    
                    <Link to="/perfil" onClick={() => setShowDrawer(false)} className="flex items-center gap-3 text-gray-300 py-3 hover:text-white border-b border-white/5 transition-colors">
                        <MdPerson size={22} /> My Profile
                    </Link>
                    
                    <Link to="/biblioteca" onClick={() => setShowDrawer(false)} className="flex items-center gap-3 text-gray-300 py-3 hover:text-white border-b border-white/5 transition-colors">
                        <MdBookmarks size={22} /> Library
                    </Link>

                    <Link to="/historico" onClick={() => setShowDrawer(false)} className="flex items-center gap-3 text-gray-300 py-3 hover:text-white border-b border-white/5 transition-colors">
                        <MdHistory size={22} /> Reading History
                    </Link>
                    
                    <button onClick={() => { logout(); setShowDrawer(false); }} className="mt-6 w-full bg-red-600/10 border border-red-600/50 hover:bg-red-600 hover:text-white text-red-500 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2">
                        <MdLogout /> Logout
                    </button>
                </>
              ) : (
                <>
                    <div className="mb-6 pb-4 border-b border-gray-700">
                        <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Menu</p>
                    </div>

                    <Link to="/" onClick={() => setShowDrawer(false)} className="flex items-center gap-3 text-gray-300 py-3 hover:text-white border-b border-white/5 transition-colors">
                        <MdHome size={22} /> Home
                    </Link>

                    <Link to="/how-it-works" onClick={() => setShowDrawer(false)} className="flex items-center gap-3 text-gray-300 py-3 hover:text-white border-b border-white/5 transition-colors">
                        <MdInfoOutline size={22} /> How it Works
                    </Link>

                    <div className="mt-6">
                        <Link to="/login" onClick={() => setShowDrawer(false)} className="block w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold text-center transition-colors shadow-lg">
                            Login / Sign Up
                        </Link>
                    </div>
                </>
              )}
          </div>
      </div>

      {/* --- HEADER DESKTOP --- */}
      <header 
        className={`sticky top-0 z-50 transition-all duration-300 border-b ${
            scrolled 
            ? 'bg-[#121212]/90 backdrop-blur-md border-[#333] shadow-lg py-2' 
            : 'bg-[#121212] border-transparent py-4'
        }`}
      >
         <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between">
             
             <div className="flex items-center gap-4">
                 <button className="lg:hidden text-gray-300 hover:text-white transition" onClick={toggleDrawer}>
                    <MdMenu size={28} />
                 </button>
                 <Link to="/" className="flex items-center gap-3 group">
                    <img src="/logo-ah.png" alt="Logo" className="h-9 w-auto object-contain transition-transform group-hover:scale-105" />
                    <span className="text-white font-serif font-bold text-xl tracking-wide hidden sm:block group-hover:text-blue-400 transition-colors">
                        Amazing<span className="text-blue-500">Humans</span>
                    </span>
                 </Link>
             </div>

             <div className="hidden lg:flex items-center gap-6">
               
               {/* GAMIFICAÇÃO DESKTOP */}
               {signed && <GamificationBar />}

               <a 
                  href="https://buymeacoffee.com/rlokin222" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#FFDD00] hover:bg-[#ffea00] text-black px-4 py-1.5 rounded-full font-bold text-xs transition-all hover:-translate-y-0.5 shadow-[0_0_15px_rgba(255,221,0,0.15)] hover:shadow-[0_0_20px_rgba(255,221,0,0.4)]"
               >
                  <FaCoffee size={14} /> Support
               </a>

               {!signed ? (
                 <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold transition text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40">
                    <MdLogin /> Login
                 </Link>
               ) : (
                 <div className="flex items-center gap-5 pl-4 border-l border-white/10">
                   <Link to="/notificacoes" className="text-gray-400 hover:text-white relative transition-colors p-1">
                     <MdNotifications size={26} />
                     {notifCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-[#121212]"></span>}
                   </Link>

                   <div className="relative group">
                       <div 
                            onClick={toggleDropdown} 
                            className="flex items-center gap-3 cursor-pointer hover:bg-[#222] p-1.5 pr-3 rounded-full transition border border-transparent hover:border-[#333] group-hover:bg-[#222]"
                       >
                         <img 
                            src={getAvatarUrl()} 
                            onError={handleImageError}
                            alt="User" 
                            className="w-9 h-9 rounded-full border-2 border-blue-500/50 object-cover" 
                         />
                         <div className="hidden xl:block">
                             <p className="text-white font-bold text-sm leading-none max-w-[100px] truncate">{user.name}</p>
                             <p className="text-[10px] text-gray-500 leading-none mt-0.5">Lvl {user.nivel}</p>
                         </div>
                         <MdArrowDropDown className="text-gray-500 group-hover:text-white transition-colors" />
                       </div>

                       {showDropdown && (
                           <div 
                             className="absolute top-14 right-0 w-64 bg-[#1f1f1f] border border-[#333] rounded-xl shadow-2xl py-2 flex flex-col z-[2000] animate-fade-in origin-top-right overflow-hidden ring-1 ring-black/5" 
                             onMouseLeave={() => setShowDropdown(false)}
                           >
                              <div className="px-5 py-4 border-b border-[#333] mb-1 bg-[#252525]">
                                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Signed in as</p>
                                  <p className="text-white font-bold truncate text-sm">{user.name}</p>
                              </div>

                              {isAdmin && isAdmin() && (
                                  <>
                                      <Link to="/admin" className="px-5 py-3 text-sm text-red-400 hover:bg-[#2a2a2a] hover:text-red-300 flex items-center gap-3 transition-colors border-l-2 border-transparent hover:border-red-500 font-bold">
                                          <MdSecurity size={18} /> Admin Panel
                                      </Link>
                                      <div className="h-px bg-[#333] my-1 mx-2"></div>
                                  </>
                              )}

                              <Link to="/perfil" className="px-5 py-3 text-sm text-gray-300 hover:bg-[#2a2a2a] hover:text-white flex items-center gap-3 transition-colors border-l-2 border-transparent hover:border-blue-500">
                                  <MdPerson size={18} className="text-blue-400" /> My Profile
                              </Link>
                              
                              <Link to="/dashboard" className="px-5 py-3 text-sm text-gray-300 hover:bg-[#2a2a2a] hover:text-white flex items-center gap-3 transition-colors border-l-2 border-transparent hover:border-green-500">
                                  <MdEditNote size={18} className="text-green-400" /> Dashboard
                              </Link>
                              
                              <div className="h-px bg-[#333] my-1 mx-2"></div>

                              <Link to="/biblioteca" className="px-5 py-3 text-sm text-gray-300 hover:bg-[#2a2a2a] hover:text-white flex items-center gap-3 transition-colors border-l-2 border-transparent hover:border-purple-500">
                                  <MdBookmarks size={18} className="text-purple-400" /> Library
                              </Link>

                              <Link to="/historico" className="px-5 py-3 text-sm text-gray-300 hover:bg-[#2a2a2a] hover:text-white flex items-center gap-3 transition-colors border-l-2 border-transparent hover:border-orange-500">
                                  <MdHistory size={18} className="text-orange-400" /> Reading History
                              </Link>

                              <div className="h-px bg-[#333] my-1 mx-2"></div>
                              
                              <button onClick={logout} className="px-5 py-3 text-sm text-red-400 hover:bg-[#2a2a2a] w-full text-left flex items-center gap-3 transition-colors font-semibold border-l-2 border-transparent hover:border-red-500">
                                  <MdLogout size={18} /> Logout
                              </button>
                           </div>
                       )}
                   </div>
                 </div>
               )}
             </div>
         </div>
      </header>
    </>
  );
}