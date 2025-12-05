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
      setScrolled(window.scrollY > 10);
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

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {showDrawer && (
        <div className="fixed inset-0 bg-black/60 z-[1000] backdrop-blur-sm transition-opacity" onClick={() => setShowDrawer(false)}></div>
      )}

      {/* Mobile Drawer */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-[#121212] border-r border-white/5 shadow-2xl z-[1001] transform transition-transform duration-300 ease-in-out ${showDrawer ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex justify-end p-4">
             <button onClick={() => setShowDrawer(false)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition">
                <MdClose size={24} />
             </button>
          </div>

          <div className="flex flex-col gap-1 p-4 pb-20">
              {signed ? (
                <>
                    <div className="flex items-center gap-3 mb-6 p-3 bg-white/5 rounded-xl border border-white/5">
                        <img src={getAvatarUrl()} className="w-10 h-10 rounded-full border border-primary object-cover" /> 
                        <p className="text-white font-bold truncate text-sm">{user.name}</p>
                    </div>
                    
                    {isAdmin && isAdmin() && (
                        <Link to="/admin" onClick={() => setShowDrawer(false)} className="drawer-link text-red-400"><MdSecurity size={20} /> Admin Panel</Link>
                    )}
                    <Link to="/" onClick={() => setShowDrawer(false)} className="drawer-link"><MdHome size={20} /> Home</Link>
                    <Link to="/perfil" onClick={() => setShowDrawer(false)} className="drawer-link"><MdPerson size={20} /> Profile</Link>
                    <Link to="/biblioteca" onClick={() => setShowDrawer(false)} className="drawer-link"><MdBookmarks size={20} /> Library</Link>
                    <Link to="/escrever" onClick={() => setShowDrawer(false)} className="drawer-link"><MdEditNote size={20} /> Write</Link>
                    <Link to="/notificacoes" onClick={() => setShowDrawer(false)} className="drawer-link flex justify-between">
                        <span className="flex items-center gap-3"><MdNotifications size={20} /> Notifications</span>
                        {notifCount > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{notifCount}</span>}
                    </Link>
                    <button onClick={() => { logout(); setShowDrawer(false); }} className="drawer-link text-red-400 mt-4 border-t border-white/5 pt-4"><MdLogout size={20} /> Logout</button>
                </>
              ) : (
                <>
                    <Link to="/" onClick={() => setShowDrawer(false)} className="drawer-link"><MdHome size={20} /> Home</Link>
                    <Link to="/login" onClick={() => setShowDrawer(false)} className="mt-4 bg-primary text-white py-3 rounded-lg font-bold text-center">Login / Sign Up</Link>
                </>
              )}
          </div>
      </div>

      {/* Desktop Header com Glassmorphism */}
      <header 
        className={`sticky top-0 z-50 transition-all duration-500 border-b ${
            scrolled 
            ? 'bg-[#0a0a0a]/80 backdrop-blur-xl border-white/5 py-3 shadow-lg' 
            : 'bg-transparent border-transparent py-5'
        }`}
      >
         <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between">
             
             <div className="flex items-center gap-4">
                 <button className="lg:hidden text-gray-300 hover:text-white" onClick={toggleDrawer}><MdMenu size={28} /></button>
                 <Link to="/" className="flex items-center gap-3 group">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-primary rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                        <img src="/logo-ah.png" alt="Logo" className="relative h-9 w-auto object-contain" />
                    </div>
                    <span className="text-white font-serif font-bold text-xl tracking-wide hidden sm:block">
                        Amazing<span className="text-primary">Humans</span>
                    </span>
                 </Link>
             </div>

             <div className="hidden lg:flex items-center gap-6">
               
               <a href="https://buymeacoffee.com/rlokin222" target="_blank" className="flex items-center gap-2 bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/20 px-4 py-1.5 rounded-full font-bold text-xs transition-all">
                  <FaCoffee size={14} /> Support
               </a>

               {!signed ? (
                 <Link to="/login" className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-full font-bold transition text-sm shadow-lg shadow-primary/20">Login</Link>
               ) : (
                 <div className="flex items-center gap-6 border-l border-white/10 pl-6">
                   <Link to="/notificacoes" className="text-gray-400 hover:text-white relative transition-colors">
                     <MdNotifications size={24} />
                     {notifCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0a0a0a]"></span>}
                   </Link>

                   <div className="relative group">
                       <button onClick={toggleDropdown} className="flex items-center gap-3 focus:outline-none">
                         <img src={getAvatarUrl()} className="w-9 h-9 rounded-full border-2 border-transparent group-hover:border-primary/50 transition-all object-cover" />
                         <MdArrowDropDown className="text-gray-500 group-hover:text-white transition-colors" />
                       </button>

                       {/* Dropdown Menu */}
                       {showDropdown && (
                           <div className="absolute top-12 right-0 w-60 glass-panel rounded-xl py-2 flex flex-col z-50 animate-fade-in origin-top-right overflow-hidden" onMouseLeave={() => setShowDropdown(false)}>
                              <div className="px-4 py-3 border-b border-white/5 mb-1">
                                  <p className="text-white font-bold truncate text-sm">{user.name}</p>
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Reader</p>
                              </div>

                              <Link to="/dashboard" className="dropdown-item"><MdEditNote className="text-green-400" /> Dashboard</Link>
                              <Link to="/perfil" className="dropdown-item"><MdPerson className="text-blue-400" /> Profile</Link>
                              <Link to="/biblioteca" className="dropdown-item"><MdBookmarks className="text-purple-400" /> Library</Link>
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

      <style>{`
        .drawer-link { @apply flex items-center gap-3 text-gray-400 py-3 hover:text-white border-b border-white/5 transition-colors text-sm font-medium; }
        .dropdown-item { @apply px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors; }
      `}</style>
    </>
  );
}