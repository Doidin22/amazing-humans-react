import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore'; 
import { Link } from 'react-router-dom';
import { 
  MdMenu, MdNotifications, MdPerson, MdEditNote, 
  MdBookmarks, MdLogout, MdArrowDropDown,
  MdHome, MdClose, MdInfoOutline, MdPhoneIphone, MdSecurity, MdMonetizationOn, MdCasino 
} from 'react-icons/md';
import { FaCoffee } from 'react-icons/fa';

export default function Header() {
  const { signed, user, logout } = useContext(AuthContext); 
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [notifCount, setNotifCount] = useState(0); 
  const [scrolled, setScrolled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  const toggleDropdown = () => setShowDropdown(!showDropdown);
  const toggleDrawer = () => setShowDrawer(!showDrawer);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "notificacoes"), where("paraId", "==", user.uid), where("lida", "==", false), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => setNotifCount(snapshot.size));
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult) => { if (choiceResult.outcome === 'accepted') setInstallPrompt(null); });
    } else {
      alert("To install: \niOS: Share > Add to Home Screen\nAndroid: Menu > Install App");
    }
  };

  const getAvatarUrl = () => {
    if (user?.avatar && user.avatar.length > 5) return user.avatar;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random&color=fff`;
  };

  const handleImgError = (e, fallbackType) => {
    e.target.onerror = null; 
    if (fallbackType === 'avatar') {
        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random&color=fff`;
    } else {
        e.target.style.display = 'none';
    }
  };

  const isUserAdmin = user?.role === 'admin';

  return (
    <>
      {/* Mobile Drawer */}
      {showDrawer && <div className="fixed inset-0 bg-black/60 z-[1000] backdrop-blur-sm" onClick={() => setShowDrawer(false)}></div>}
      
      <div className={`fixed top-0 left-0 h-full w-72 bg-[#121212] border-r border-white/5 shadow-2xl z-[1001] transform transition-transform duration-300 ease-in-out ${showDrawer ? 'translate-x-0' : '-translate-x-full'} overflow-y-auto`}>
          <div className="flex justify-end p-4">
             <button onClick={() => setShowDrawer(false)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition"><MdClose size={24} /></button>
          </div>

          <div className="flex flex-col gap-1 p-4 pb-20">
              <div className="mx-2 mb-6 p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 shadow-inner">
                  <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold text-sm"><MdPhoneIphone /> <span>Install App</span></div>
                  <button onClick={handleInstallClick} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-lg transition-all active:scale-95">Install Now</button>
              </div>

              {signed ? (
                <>
                    <div className="flex flex-col gap-2 mb-6 p-3 bg-white/5 rounded-xl border border-white/5 mx-2">
                        <div className="flex items-center gap-3">
                            <img src={getAvatarUrl()} alt="User" className="w-10 h-10 rounded-full border border-primary object-cover" onError={(e) => handleImgError(e, 'avatar')} /> 
                            <div className="overflow-hidden">
                                <p className="text-white font-bold truncate text-sm">{user.name}</p>
                                <p className="text-[10px] text-yellow-500 font-bold uppercase">Lvl {user.level || 0}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 bg-black/30 p-2 rounded text-xs text-yellow-400 font-bold border border-yellow-500/20 justify-center">
                            <MdMonetizationOn /> {user.coins || 0} Coins
                        </div>
                    </div>
                    
                    {isUserAdmin && <Link to="/admin" onClick={() => setShowDrawer(false)} className="drawer-link text-red-400 bg-red-500/10 border-red-500/20 mb-2 rounded-lg"><MdSecurity size={20} /> Admin Panel</Link>}

                    <Link to="/" onClick={() => setShowDrawer(false)} className="drawer-link"><MdHome size={20} /> Home</Link>
                    <Link to="/perfil" onClick={() => setShowDrawer(false)} className="drawer-link"><MdPerson size={20} /> Profile & Wallet</Link>
                    <Link to="/biblioteca" onClick={() => setShowDrawer(false)} className="drawer-link"><MdBookmarks size={20} /> Library</Link>
                    <Link to="/escrever" onClick={() => setShowDrawer(false)} className="drawer-link"><MdEditNote size={20} /> Write</Link>
                    
                    {/* LINK NOVO: SORTEIO (MOBILE) */}
                    <Link to="/sorteio" onClick={() => setShowDrawer(false)} className="drawer-link text-yellow-500">
                        <MdCasino size={20} /> Monthly Lottery
                    </Link>

                    <Link to="/notificacoes" onClick={() => setShowDrawer(false)} className="drawer-link flex justify-between">
                        <span className="flex items-center gap-3"><MdNotifications size={20} /> Notifications</span>
                        {notifCount > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{notifCount}</span>}
                    </Link>
                    <button onClick={() => { logout(); setShowDrawer(false); }} className="drawer-link text-red-400 mt-4 border-t border-white/5 pt-4"><MdLogout size={20} /> Logout</button>
                </>
              ) : (
                <>
                    <Link to="/" onClick={() => setShowDrawer(false)} className="drawer-link"><MdHome size={20} /> Home</Link>
                    <Link to="/how-it-works" onClick={() => setShowDrawer(false)} className="drawer-link"><MdInfoOutline size={20} /> How it Works</Link>
                    <Link to="/login" onClick={() => setShowDrawer(false)} className="mt-4 mx-2 bg-primary text-white py-3 rounded-lg font-bold text-center shadow-lg">Login / Sign Up</Link>
                </>
              )}
          </div>
      </div>

      <header className={`sticky top-0 z-50 transition-all duration-500 border-b ${scrolled ? 'bg-[#0a0a0a]/80 backdrop-blur-xl border-white/5 py-3 shadow-lg' : 'bg-transparent border-transparent py-5'}`}>
         <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between">
             <div className="flex items-center gap-4">
                 <button className="lg:hidden text-gray-300 hover:text-white" onClick={toggleDrawer}><MdMenu size={28} /></button>
                 <Link to="/" className="flex items-center gap-3 group">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-primary rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                        <img src="/logo-ah.png" alt="Logo" className="relative h-9 w-auto object-contain" onError={(e) => handleImgError(e, 'logo')} />
                    </div>
                    <span className="text-white font-serif font-bold text-xl tracking-wide hidden sm:block">Amazing<span className="text-primary">Humans</span></span>
                 </Link>
             </div>

             <div className="hidden lg:flex items-center gap-6">
               <a href="https://buymeacoffee.com/rlokin222" target="_blank" className="flex items-center gap-2 bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/20 px-4 py-1.5 rounded-full font-bold text-xs transition-all"><FaCoffee size={14} /> Support</a>

               {!signed ? (
                 <Link to="/login" className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-full font-bold transition text-sm shadow-lg shadow-primary/20">Login</Link>
               ) : (
                 <div className="flex items-center gap-6 border-l border-white/10 pl-6">
                   
                   {/* MOEDAS (DESKTOP) */}
                   <div className="flex items-center gap-1 text-yellow-400 font-bold bg-white/5 px-3 py-1 rounded-full border border-white/10" title="Your Coins">
                        <MdMonetizationOn /> {user.coins || 0}
                   </div>

                   <Link to="/notificacoes" className="text-gray-400 hover:text-white relative transition-colors">
                     <MdNotifications size={24} />
                     {notifCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0a0a0a]"></span>}
                   </Link>

                   <div className="relative group">
                       <button onClick={toggleDropdown} className="flex items-center gap-3 focus:outline-none">
                         <img src={getAvatarUrl()} className="w-9 h-9 rounded-full border-2 border-transparent group-hover:border-primary/50 transition-all object-cover" onError={(e) => handleImgError(e, 'avatar')} />
                         <MdArrowDropDown className="text-gray-500 group-hover:text-white transition-colors" />
                       </button>

                       {showDropdown && (
                           <div className="absolute top-12 right-0 w-60 glass-panel rounded-xl py-2 flex flex-col z-50 animate-fade-in origin-top-right overflow-hidden" onMouseLeave={() => setShowDropdown(false)}>
                              <div className="px-4 py-3 border-b border-white/5 mb-1">
                                  <p className="text-white font-bold truncate text-sm">{user.name}</p>
                                  <div className="flex justify-between items-center mt-1">
                                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{user.role}</p>
                                      <p className="text-[10px] text-yellow-500 font-bold uppercase">Level {user.level || 0}</p>
                                  </div>
                              </div>
                              {isUserAdmin && <Link to="/admin" className="dropdown-item text-red-400 hover:bg-red-500/10"><MdSecurity className="text-red-400" /> Admin Panel</Link>}
                              <Link to="/dashboard" className="dropdown-item"><MdEditNote className="text-green-400" /> Dashboard</Link>
                              <Link to="/perfil" className="dropdown-item"><MdPerson className="text-blue-400" /> Profile</Link>
                              <Link to="/biblioteca" className="dropdown-item"><MdBookmarks className="text-purple-400" /> Library</Link>
                              
                              {/* LINK NOVO: SORTEIO (DESKTOP) */}
                              <Link to="/sorteio" className="dropdown-item text-yellow-400 hover:bg-yellow-500/10">
                                  <MdCasino /> Lottery
                              </Link>

                              <div className="h-px bg-white/5 my-1"></div>
                              <button onClick={logout} className="dropdown-item text-red-400 hover:text-red-300"><MdLogout /> Logout</button>
                           </div>
                       )}
                   </div>
                 </div>
               )}
             </div>
         </div>
      </header>
      <style>{`.drawer-link { @apply flex items-center gap-3 text-gray-400 py-3 hover:text-white border-b border-white/5 transition-colors text-sm font-medium px-2; } .dropdown-item { @apply px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors; }`}</style>
    </>
  );
}