import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore'; 
import { Link } from 'react-router-dom';
import { 
  MdMenu, MdNotifications, MdPerson, MdEditNote, 
  MdBookmarks, MdLogout, MdArrowDropDown,
  MdHome, MdClose, MdLogin, MdDiamond, MdHistory
} from 'react-icons/md';

export default function Header() {
  const { signed, user, logout } = useContext(AuthContext);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [notifCount, setNotifCount] = useState(0); 

  const toggleDropdown = () => setShowDropdown(!showDropdown);
  const toggleDrawer = () => setShowDrawer(!showDrawer);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "notificacoes"), where("paraId", "==", user.uid), where("lida", "==", false), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => setNotifCount(snapshot.size));
    return () => unsubscribe();
  }, [user]);

  // Função auxiliar para garantir a imagem (igual ao Perfil)
  const getAvatarUrl = () => {
    if (user?.avatar) return user.avatar;
    return `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`;
  };

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`;
  };

  return (
    <>
      {/* --- MENU MOBILE (DRAWER) --- */}
      {showDrawer && (
        <div className="fixed inset-0 bg-black/80 z-[1000]" onClick={() => setShowDrawer(false)}></div>
      )}

      <div className={`fixed top-0 left-0 h-full w-72 bg-[#1f1f1f] shadow-2xl z-[1001] transform transition-transform duration-300 ease-in-out ${showDrawer ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex justify-end p-4">
             <MdClose size={28} className="text-gray-400 cursor-pointer hover:text-white" onClick={() => setShowDrawer(false)} />
          </div>

          <div className="flex flex-col gap-2 p-4">
              {signed ? (
                <>
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-700">
                        {/* FOTO CORRIGIDA NO MOBILE */}
                        <img 
                            src={getAvatarUrl()} 
                            onError={handleImageError}
                            alt="Avatar" 
                            className="w-10 h-10 rounded-full border border-blue-500 object-cover" 
                        /> 
                        <p className="text-white font-bold truncate">{user.name}</p>
                    </div>
                    <Link to="/" onClick={() => setShowDrawer(false)} className="flex items-center gap-3 text-gray-300 py-3 hover:text-white"><MdHome size={22} /> Home</Link>
                    <Link to="/notificacoes" onClick={() => setShowDrawer(false)} className="flex items-center gap-3 text-gray-300 py-3 hover:text-white"><MdNotifications size={22} /> Notifications</Link>
                    <Link to="/assinatura" onClick={() => setShowDrawer(false)} className="flex items-center gap-3 text-blue-400 py-3 font-bold"><MdDiamond size={22} /> Premium</Link>
                    <Link to="/perfil" onClick={() => setShowDrawer(false)} className="flex items-center gap-3 text-gray-300 py-3 hover:text-white"><MdPerson size={22} /> Profile</Link>
                    <Link to="/biblioteca" onClick={() => setShowDrawer(false)} className="flex items-center gap-3 text-gray-300 py-3 hover:text-white"><MdBookmarks size={22} /> Library</Link>
                    <Link to="/historico" onClick={() => setShowDrawer(false)} className="flex items-center gap-3 text-gray-300 py-3 hover:text-white"><MdHistory size={22} /> History</Link>
                    <Link to="/dashboard" onClick={() => setShowDrawer(false)} className="flex items-center gap-3 text-gray-300 py-3 hover:text-white"><MdEditNote size={22} /> Dashboard</Link>
                    <button onClick={() => { logout(); setShowDrawer(false); }} className="mt-6 w-full bg-red-600 text-white py-2 rounded font-bold">Logout</button>
                </>
              ) : (
                <Link to="/login" onClick={() => setShowDrawer(false)} className="w-full bg-blue-600 text-white py-2 rounded font-bold text-center">Login</Link>
              )}
          </div>
      </div>

      {/* --- HEADER PRINCIPAL --- */}
      <header className="sticky top-0 z-50 bg-[#151515] border-b border-[#333] h-16 flex items-center justify-between px-4 lg:px-8 shadow-md">
         <div className="flex items-center gap-4">
             <button className="lg:hidden text-gray-300" onClick={toggleDrawer}><MdMenu size={28} /></button>
             <Link to="/" className="flex items-center gap-2">
                <img src="/logo-ah.png" alt="Logo" className="h-8 w-auto object-contain" />
                <span className="text-blue-500 font-bold text-lg tracking-wide hidden sm:block">AMAZING HUMANS</span>
             </Link>
         </div>

         <div className="hidden lg:flex items-center gap-6">
           {!signed ? (
             <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-1.5 rounded font-bold transition text-sm flex items-center gap-2">
                <MdLogin /> Login
             </Link>
           ) : (
             <div className="flex items-center gap-5">
               <Link to="/notificacoes" className="text-gray-400 hover:text-white relative">
                 <MdNotifications size={24} />
                 {notifCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}
               </Link>

               <div className="relative group">
                   {/* BOTÃO DROPDOWN COM FOTO CORRIGIDA */}
                   <div onClick={toggleDropdown} className="flex items-center gap-2 cursor-pointer hover:bg-[#222] p-1.5 rounded transition border border-transparent hover:border-[#333]">
                     <img 
                        src={getAvatarUrl()} 
                        onError={handleImageError}
                        alt="User" 
                        className="w-8 h-8 rounded-full border border-gray-600 object-cover" 
                     />
                     <span className="text-gray-300 font-medium text-sm max-w-[100px] truncate">{user.name}</span>
                     <MdArrowDropDown className="text-gray-500" />
                   </div>

                   {/* DROPDOWN MENU */}
                   {showDropdown && (
                       <div 
                         className="absolute top-12 right-0 w-64 bg-[#1f1f1f] border border-[#333] rounded-lg shadow-2xl py-2 flex flex-col z-[2000]" 
                         onMouseLeave={() => setShowDropdown(false)}
                       >
                          <div className="px-4 py-2 border-b border-[#333] mb-1">
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Signed in as</p>
                              <p className="text-white font-bold truncate text-sm">{user.name}</p>
                          </div>

                          <Link to="/assinatura" className="px-4 py-2.5 text-sm text-blue-400 hover:bg-[#2a2a2a] font-bold flex items-center gap-3 transition-colors">
                              <MdDiamond size={18} /> Go Premium
                          </Link>

                          <Link to="/perfil" className="px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2a2a2a] hover:text-white flex items-center gap-3 transition-colors">
                              <MdPerson size={18} /> My Profile
                          </Link>
                          
                          <Link to="/dashboard" className="px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2a2a2a] hover:text-white flex items-center gap-3 transition-colors">
                              <MdEditNote size={18} /> Dashboard
                          </Link>
                          
                          <Link to="/biblioteca" className="px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2a2a2a] hover:text-white flex items-center gap-3 transition-colors">
                              <MdBookmarks size={18} /> Library
                          </Link>

                          <Link to="/historico" className="px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2a2a2a] hover:text-white flex items-center gap-3 transition-colors">
                              <MdHistory size={18} /> Reading History
                          </Link>

                          <div className="h-px bg-[#333] my-1 mx-2"></div>
                          
                          <button onClick={logout} className="px-4 py-2.5 text-sm text-red-400 hover:bg-[#2a2a2a] w-full text-left flex items-center gap-3 transition-colors font-semibold">
                              <MdLogout size={18} /> Logout
                          </button>
                       </div>
                   )}
               </div>
             </div>
           )}
         </div>
      </header>
    </>
  );
}