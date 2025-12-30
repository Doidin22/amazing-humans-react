import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { 
    collection, query, orderBy, getDocs, doc, deleteDoc, updateDoc, 
    where, getCountFromServer, limit, arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { 
    MdDelete, MdCheck, MdWarning, MdSecurity, MdOpenInNew, 
    MdPeople, MdMenuBook, MdBarChart, MdSearch, MdBlock, MdVerified, 
    MdSupervisedUserCircle, MdVisibility, MdVisibilityOff, MdClose, MdEditDocument
} from 'react-icons/md';
import toast from 'react-hot-toast';

export default function Admin() {
  const { user, isAdmin, loadingAuth } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('reports'); // reports, users
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ users: 0, books: 0, reports: 0 });
  const [loading, setLoading] = useState(true);

  // States para User Management
  const [userSearch, setUserSearch] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  
  // States para Modal de Conteúdo do Usuário
  const [selectedUser, setSelectedUser] = useState(null);
  const [userWorks, setUserWorks] = useState([]);
  const [loadingWorks, setLoadingWorks] = useState(false);

  useEffect(() => {
    if (loadingAuth) return;
    if (!isAdmin()) {
        toast.error("Access Denied");
        navigate('/');
        return;
    }
    loadDashboard();
  }, [user, loadingAuth, isAdmin, navigate]);

  async function loadDashboard() {
    setLoading(true);
    try {
        // 1. Carregar Reports
        const qReports = query(collection(db, "reports"), orderBy("timestamp", "desc"));
        const snapReports = await getDocs(qReports);
        let listaReports = [];
        snapReports.forEach(d => listaReports.push({ id: d.id, ...d.data() }));
        setReports(listaReports);

        // 2. Carregar Estatísticas (Counts)
        const collUsers = collection(db, "usuarios");
        const collBooks = collection(db, "obras");
        const snapUsers = await getCountFromServer(collUsers);
        const snapBooks = await getCountFromServer(collBooks);

        setStats({
            users: snapUsers.data().count,
            books: snapBooks.data().count,
            reports: snapReports.size
        });

    } catch (error) {
        console.error(error);
        toast.error("Error loading admin data");
    } finally {
        setLoading(false);
    }
  }

  // --- AÇÕES DE REPORTS ---

  async function handleDeleteContent(report) {
      if(!window.confirm(`DANGER: Delete "${report.targetName}" permanently?`)) return;
      try {
          const collectionName = report.targetType === 'book' ? 'obras' : 'capitulos';
          await deleteDoc(doc(db, collectionName, report.targetId));
          await updateDoc(doc(db, "reports", report.id), { status: 'resolved_deleted' });
          
          setReports(reports.map(r => r.id === report.id ? { ...r, status: 'resolved_deleted' } : r));
          toast.success("Content deleted.");
      } catch (error) {
          toast.error("Error deleting content.");
      }
  }

  async function handleDismiss(reportId) {
      try {
          await updateDoc(doc(db, "reports", reportId), { status: 'dismissed' });
          setReports(reports.map(r => r.id === reportId ? { ...r, status: 'dismissed' } : r));
          toast.success("Report dismissed.");
      } catch (error) { toast.error("Error updating report."); }
  }

  // --- AÇÕES DE USUÁRIOS ---

  async function searchUsers(e) {
      e.preventDefault();
      if(!userSearch.trim()) return;
      
      try {
          // Busca por Email exato
          const q = query(collection(db, "usuarios"), where("email", "==", userSearch.trim()));
          const snap = await getDocs(q);
          let users = [];
          snap.forEach(d => users.push({ id: d.id, ...d.data() }));
          
          // Busca "contains" (simulada) por nome se não achar por email
          if(users.length === 0) {
              const qName = query(collection(db, "usuarios"), orderBy("nome"), limit(50));
              const snapName = await getDocs(qName);
              snapName.forEach(d => {
                  const u = d.data();
                  if(u.nome.toLowerCase().includes(userSearch.toLowerCase())) {
                      users.push({ id: d.id, ...u });
                  }
              });
          }
          
          users = users.filter((v,i,a)=>a.findIndex(v2=>(v2.id===v.id))===i); // Remove duplicatas
          setFoundUsers(users);
          
          if(users.length === 0) toast("No user found.");

      } catch(error) {
          console.error(error);
          toast.error("Search failed.");
      }
  }

  async function toggleBanUser(targetUser) {
      const isBanned = targetUser.banned === true;
      const action = isBanned ? "Unban" : "Ban";
      
      if(!window.confirm(`Are you sure you want to ${action} ${targetUser.nome}?`)) return;

      try {
          await updateDoc(doc(db, "usuarios", targetUser.id), { banned: !isBanned });
          setFoundUsers(foundUsers.map(u => u.id === targetUser.id ? {...u, banned: !isBanned} : u));
          toast.success(`User ${action}ned successfully.`);
      } catch(error) { toast.error("Action failed."); }
  }

  async function toggleAdminRole(targetUser) {
      const isAdminAlready = targetUser.role === 'admin';
      const action = isAdminAlready ? "Revoke Admin from" : "Promote to Admin";
      const newRole = isAdminAlready ? 'user' : 'admin';

      if(!window.confirm(`${action} ${targetUser.nome}?`)) return;
      try {
          await updateDoc(doc(db, "usuarios", targetUser.id), { role: newRole });
          setFoundUsers(foundUsers.map(u => u.id === targetUser.id ? {...u, role: newRole} : u));
          toast.success(`Success: ${action} ${targetUser.nome}`);
      } catch(error) { toast.error("Failed."); }
  }

  async function toggleVerifyUser(targetUser) {
      const isVerified = targetUser.badges?.includes('verified');
      const action = isVerified ? "Remove Verification" : "Verify User";
      
      try {
          const userRef = doc(db, "usuarios", targetUser.id);
          if (isVerified) {
              await updateDoc(userRef, { badges: arrayRemove('verified') });
          } else {
              await updateDoc(userRef, { badges: arrayUnion('verified') });
          }
          
          // Atualiza lista local
          const updatedBadges = isVerified 
            ? (targetUser.badges || []).filter(b => b !== 'verified')
            : [...(targetUser.badges || []), 'verified'];

          setFoundUsers(foundUsers.map(u => u.id === targetUser.id ? {...u, badges: updatedBadges} : u));
          toast.success(`${action} successful.`);
      } catch(error) { toast.error("Failed to update badge."); }
  }

  // --- GERENCIAMENTO DE CONTEÚDO DO USUÁRIO ---

  async function openUserContent(targetUser) {
      setSelectedUser(targetUser);
      setLoadingWorks(true);
      try {
          const q = query(collection(db, "obras"), where("autorId", "==", targetUser.id));
          const snap = await getDocs(q);
          let works = [];
          snap.forEach(d => works.push({ id: d.id, ...d.data() }));
          setUserWorks(works);
      } catch(error) {
          toast.error("Error loading user works.");
      } finally {
          setLoadingWorks(false);
      }
  }

  async function toggleWorkVisibility(work) {
      const isBanned = work.status === 'banned';
      const newStatus = isBanned ? 'public' : 'banned';
      try {
          await updateDoc(doc(db, "obras", work.id), { status: newStatus });
          setUserWorks(userWorks.map(w => w.id === work.id ? {...w, status: newStatus} : w));
          toast.success(`Work ${isBanned ? 'Restored' : 'Hidden/Banned'}`);
      } catch(e) { toast.error("Error updating work."); }
  }

  async function deleteWork(workId) {
      if(!window.confirm("DELETE this story permanently? This cannot be undone.")) return;
      try {
          await deleteDoc(doc(db, "obras", workId));
          setUserWorks(userWorks.filter(w => w.id !== workId));
          toast.success("Story deleted.");
      } catch(e) { toast.error("Error deleting story."); }
  }

  if (loading || loadingAuth) return <div className="loading-spinner"></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 min-h-screen relative">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
                <MdSecurity size={36} className="text-red-500" />
                <div>
                    <h1 className="text-3xl font-bold text-white">Admin Console</h1>
                    <p className="text-gray-500 text-xs uppercase tracking-widest">System Management</p>
                </div>
            </div>
            
            {/* STATS CARDS */}
            <div className="flex gap-4">
                <div className="bg-[#1f1f1f] px-4 py-2 rounded-lg border border-[#333] text-center">
                    <span className="block text-xl font-bold text-white">{stats.users}</span>
                    <span className="text-[10px] text-gray-500 uppercase flex items-center justify-center gap-1"><MdPeople /> Users</span>
                </div>
                <div className="bg-[#1f1f1f] px-4 py-2 rounded-lg border border-[#333] text-center">
                    <span className="block text-xl font-bold text-white">{stats.books}</span>
                    <span className="text-[10px] text-gray-500 uppercase flex items-center justify-center gap-1"><MdMenuBook /> Books</span>
                </div>
                <div className="bg-[#1f1f1f] px-4 py-2 rounded-lg border border-[#333] text-center">
                    <span className="block text-xl font-bold text-red-400">{stats.reports}</span>
                    <span className="text-[10px] text-gray-500 uppercase flex items-center justify-center gap-1"><MdWarning /> Reports</span>
                </div>
            </div>
        </div>

        {/* TABS */}
        <div className="flex gap-6 mb-8 border-b border-white/5">
            <button 
                onClick={() => setActiveTab('reports')} 
                className={`pb-3 px-2 text-sm font-bold uppercase tracking-wide transition-all ${activeTab === 'reports' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-500 hover:text-white'}`}
            >
                Reports
            </button>
            <button 
                onClick={() => setActiveTab('users')} 
                className={`pb-3 px-2 text-sm font-bold uppercase tracking-wide transition-all ${activeTab === 'users' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-white'}`}
            >
                User Manager
            </button>
        </div>

        {/* --- ABA REPORTS --- */}
        {activeTab === 'reports' && (
            <div className="grid gap-4">
                {reports.length === 0 ? <p className="text-gray-500">No reports found.</p> : reports.map(report => (
                    <div key={report.id} className={`p-4 rounded-xl border ${report.status === 'pending' ? 'bg-[#1f1f1f] border-red-500/30' : 'bg-[#151515] border-[#333] opacity-60'}`}>
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${report.targetType === 'book' ? 'bg-blue-900 text-blue-300' : 'bg-green-900 text-green-300'}`}>
                                        {report.targetType}
                                    </span>
                                    <span className="text-xs text-gray-500">{report.timestamp ? new Date(report.timestamp.seconds * 1000).toLocaleString() : ''}</span>
                                    {report.status !== 'pending' && <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-gray-700 text-gray-300">{report.status}</span>}
                                </div>
                                <h3 className="text-white font-bold text-lg mb-1">{report.targetName}</h3>
                                <p className="text-red-400 text-sm font-bold flex items-center gap-2"><MdWarning /> Reason: {report.reason}</p>
                                <p className="text-gray-400 text-sm mt-1 bg-black/20 p-2 rounded">"{report.description}"</p>
                                <p className="text-gray-600 text-xs mt-2">Reporter: {report.reporterName}</p>
                            </div>

                            <div className="flex flex-col gap-2 ml-4">
                                <Link to={report.targetType === 'book' ? `/obra/${report.targetId}` : `/ler/${report.targetId}`} target="_blank" className="btn-admin-action bg-[#333] text-white"><MdOpenInNew /> View</Link>
                                {report.status === 'pending' && (
                                    <>
                                        <button onClick={() => handleDismiss(report.id)} className="btn-admin-action bg-green-900/30 text-green-500 border-green-500/30"><MdCheck /> Dismiss</button>
                                        <button onClick={() => handleDeleteContent(report)} className="btn-admin-action bg-red-900/30 text-red-500 border-red-500/30"><MdDelete /> Delete</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* --- ABA USERS --- */}
        {activeTab === 'users' && (
            <div>
                <form onSubmit={searchUsers} className="flex gap-2 mb-8 max-w-lg">
                    <div className="relative flex-1">
                        <MdSearch className="absolute left-3 top-3 text-gray-500 text-xl" />
                        <input 
                            type="text" 
                            placeholder="Search user by email or name..." 
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-[#333] text-white pl-10 pr-4 py-3 rounded-lg outline-none focus:border-blue-500"
                        />
                    </div>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-lg font-bold">Search</button>
                </form>

                <div className="space-y-4">
                    {foundUsers.map(u => (
                        <div key={u.id} className="bg-[#1f1f1f] border border-[#333] p-4 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <img src={u.foto || "https://ui-avatars.com/api/?background=random"} className="w-12 h-12 rounded-full object-cover" alt="User" />
                                <div>
                                    <h4 className="text-white font-bold flex items-center gap-2">
                                        {u.nome} 
                                        {u.role === 'admin' && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded uppercase flex items-center gap-1"><MdSecurity size={10} /> Admin</span>}
                                        {u.banned && <span className="bg-gray-500 text-white text-[10px] px-1.5 py-0.5 rounded uppercase flex items-center gap-1"><MdBlock size={10} /> Banned</span>}
                                        {u.badges?.includes('verified') && <MdVerified className="text-blue-400" title="Verified" />}
                                    </h4>
                                    <p className="text-gray-500 text-sm">{u.email}</p>
                                    <p className="text-gray-600 text-xs mt-1">ID: {u.id}</p>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 items-end">
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => openUserContent(u)}
                                        className="text-xs font-bold text-gray-300 hover:text-white border border-[#444] px-3 py-2 rounded hover:bg-[#333] flex items-center gap-1"
                                    >
                                        <MdEditDocument /> Manage Content
                                    </button>
                                    
                                    <button 
                                        onClick={() => toggleVerifyUser(u)} 
                                        className={`text-xs font-bold px-3 py-2 rounded flex items-center gap-1 transition-colors border ${u.badges?.includes('verified') ? 'border-blue-500/50 text-blue-400 hover:bg-blue-500/10' : 'border-gray-600 text-gray-400 hover:text-white'}`}
                                    >
                                        <MdVerified /> {u.badges?.includes('verified') ? 'Unverify' : 'Verify'}
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => toggleAdminRole(u)} className={`text-xs font-bold border border-[#444] px-3 py-2 rounded hover:bg-[#333] flex items-center gap-1 ${u.role === 'admin' ? 'text-red-400' : 'text-gray-400'}`}>
                                        <MdSupervisedUserCircle /> {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                                    </button>
                                    
                                    <button 
                                        onClick={() => toggleBanUser(u)} 
                                        className={`text-xs font-bold px-4 py-2 rounded flex items-center gap-1 transition-colors ${u.banned ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-red-600/20 text-red-500 border border-red-500/50 hover:bg-red-600 hover:text-white'}`}
                                    >
                                        {u.banned ? <><MdCheck /> Unban User</> : <><MdBlock /> Ban User</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- MODAL DE GERENCIAMENTO DE CONTEÚDO --- */}
        {selectedUser && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-[#1a1a1a] w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#222]">
                        <h3 className="text-white font-bold text-lg flex items-center gap-2"><MdEditDocument /> Managing: {selectedUser.nome}</h3>
                        <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"><MdClose size={24} /></button>
                    </div>
                    
                    <div className="p-4 overflow-y-auto flex-1">
                        {loadingWorks ? (
                            <div className="text-center py-10"><div className="loading-spinner"></div></div>
                        ) : userWorks.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 italic">User has no published works.</div>
                        ) : (
                            <div className="space-y-3">
                                {userWorks.map(work => (
                                    <div key={work.id} className="bg-[#121212] p-3 rounded-lg border border-[#333] flex justify-between items-center">
                                        <div className="flex gap-3">
                                            <img src={work.capa} className="w-10 h-14 object-cover rounded bg-[#333]" alt="Cover" />
                                            <div>
                                                <h4 className="text-white font-bold text-sm line-clamp-1">{work.titulo}</h4>
                                                <div className="flex gap-2 mt-1">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${work.status === 'banned' ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>
                                                        {work.status}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 flex items-center gap-1"><MdVisibility /> {work.views || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => toggleWorkVisibility(work)}
                                                className={`p-2 rounded-lg border transition-colors ${work.status === 'banned' ? 'border-green-500/30 text-green-500 hover:bg-green-500/10' : 'border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10'}`}
                                                title={work.status === 'banned' ? "Restore / Unhide" : "Hide / Shadowban"}
                                            >
                                                {work.status === 'banned' ? <MdVisibility /> : <MdVisibilityOff />}
                                            </button>
                                            <button 
                                                onClick={() => deleteWork(work.id)}
                                                className="p-2 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
                                                title="Delete Permanently"
                                            >
                                                <MdDelete />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        <style>{`
            .btn-admin-action {
                @apply px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-transparent hover:border-white/20;
            }
        `}</style>
    </div>
  );
}