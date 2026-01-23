
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../../types';
import { storageService } from '../../services/storageService';

const UserManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const PROTECTED_EMAILS = [
    'admin@gov.my',
    'pengurus@gov.my',
    'ketua_unit@gov.my'
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await storageService.getUsers();
      setUsers(data);
    } catch (e) {
      console.error("Gagal memuat pengguna:", e);
    } finally {
      setLoading(false);
    }
  };

  const isUserProtected = (user: User) => {
    const isMasterId = user.id === 'master-admin';
    const emailLower = (user.email || '').toLowerCase();
    return isMasterId || PROTECTED_EMAILS.includes(emailLower);
  };

  const handleToggleVerify = async (e: React.MouseEvent, user: User) => {
    e.preventDefault(); e.stopPropagation();
    setProcessingId(user.id);
    try {
      const isCurrentlyVerified = String(user.verified).toUpperCase() === 'TRUE' || user.verified === true;
      await storageService.updateUser({ ...user, verified: !isCurrentlyVerified });
      await loadUsers();
    } catch (e) {
      alert("Gagal mengemaskini status.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleAdmin = async (e: React.MouseEvent, user: User) => {
    e.preventDefault(); e.stopPropagation();
    if (isUserProtected(user)) {
      alert("❌ AKAUN DILINDUNGI\nPeranan pentadbir ini tidak boleh diubah.");
      return;
    }
    setProcessingId(user.id);
    try {
      const isCurrentlyAdmin = String(user.isAdmin).toUpperCase() === 'TRUE' || user.isAdmin === true;
      await storageService.updateUser({ ...user, isAdmin: !isCurrentlyAdmin });
      await loadUsers();
    } catch (e) {
      alert("Gagal menukar peranan.");
    } finally {
      setProcessingId(null);
    }
  };

  const initiateDelete = (e: React.MouseEvent, userId: string) => {
    e.preventDefault(); e.stopPropagation();
    console.log("Peringkat 1: Sedia untuk padam", userId);
    setConfirmDeleteId(userId);
    // Batalkan mod sahkan selepas 3 saat jika tidak diklik
    setTimeout(() => setConfirmDeleteId(null), 3000);
  };

  const executeDelete = async (e: React.MouseEvent, user: User) => {
    e.preventDefault(); e.stopPropagation();
    console.log("Peringkat 2: Memulakan pemadaman kekal", user.email);
    
    if (isUserProtected(user)) {
      alert("Tindakan disekat.");
      setConfirmDeleteId(null);
      return;
    }

    setProcessingId(user.id);
    try {
      await storageService.deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setConfirmDeleteId(null);
      console.log("Berjaya padam!");
    } catch (e) {
      alert("Ralat Cloud: Gagal padam.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Memuatkan Pangkalan Data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-[100] shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/" className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-800 border border-slate-700 hover:bg-indigo-600 transition-all">
              <i className="fas fa-arrow-left"></i>
            </Link>
            <h1 className="text-lg font-black tracking-tight">Pengurusan Akses</h1>
          </div>
          <button onClick={loadUsers} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl active:scale-90 transition-all">
            <i className={`fas fa-sync-alt ${processingId ? 'animate-spin' : ''}`}></i>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kakitangan</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Peranan</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tindakan Pantas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map(user => {
                  const isAdmin = String(user.isAdmin).toUpperCase() === 'TRUE' || user.isAdmin === true;
                  const isVerified = String(user.verified).toUpperCase() === 'TRUE' || user.verified === true;
                  const isProtected = isUserProtected(user);
                  const isProcessing = processingId === user.id;
                  const isConfirming = confirmDeleteId === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${isAdmin ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-base leading-tight">{user.name}</p>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-8 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest border ${isVerified ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                          {isVerified ? 'AKTIF' : 'PENDING'}
                        </span>
                      </td>

                      <td className="px-8 py-6 text-center">
                         <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest border ${isAdmin ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                          {isAdmin ? 'ADMIN' : 'USER'}
                        </span>
                      </td>

                      <td className="px-8 py-6">
                        <div className="flex items-center justify-end space-x-3">
                          {/* BUTTON: VERIFY */}
                          <button
                            onClick={(e) => handleToggleVerify(e, user)}
                            className={`relative z-10 px-4 py-2.5 rounded-2xl text-[10px] font-black transition-all active:scale-90 border ${
                              isVerified ? 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50' : 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100 hover:bg-emerald-700'
                            }`}
                          >
                            {isProcessing ? <i className="fas fa-spinner animate-spin"></i> : isVerified ? 'NYAH-SAH' : 'SAHKAN'}
                          </button>

                          {/* BUTTON: TOGGLE ADMIN */}
                          <button
                            onClick={(e) => handleToggleAdmin(e, user)}
                            className={`relative z-10 px-4 py-2.5 rounded-2xl text-[10px] font-black transition-all active:scale-90 border ${
                              isProtected ? 'bg-slate-50 text-slate-200 border-slate-100 cursor-not-allowed' :
                              isAdmin ? 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50' : 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100 hover:bg-indigo-700'
                            }`}
                          >
                            {isAdmin ? 'TURUN' : 'NAIK'}
                          </button>

                          {/* BUTTON: DELETE (INLINE CONFIRMATION) */}
                          {isProtected ? (
                            <div className="w-11 h-11 flex items-center justify-center text-slate-200 border border-slate-100 rounded-2xl bg-slate-50 cursor-not-allowed">
                              <i className="fas fa-lock text-xs"></i>
                            </div>
                          ) : isConfirming ? (
                            <button
                              onClick={(e) => executeDelete(e, user)}
                              className="relative z-50 bg-rose-600 text-white px-4 py-2.5 rounded-2xl text-[10px] font-black animate-pulse shadow-xl shadow-rose-200 border border-rose-600 active:scale-95"
                            >
                              SAHKAN?
                            </button>
                          ) : (
                            <button
                              onClick={(e) => initiateDelete(e, user.id)}
                              className="relative z-10 w-11 h-11 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-600 hover:text-white transition-all active:scale-90 shadow-sm"
                            >
                              <i className={`fas ${isProcessing ? 'fa-spinner animate-spin' : 'fa-trash-alt'} text-sm`}></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 p-6 bg-slate-900 rounded-[2rem] text-white flex items-center justify-between overflow-hidden relative">
          <i className="fas fa-user-shield absolute -right-4 -bottom-4 text-7xl text-white/5 rotate-12"></i>
          <div>
            <h4 className="font-bold mb-1">Nota Pentadbir</h4>
            <p className="text-xs text-slate-400 font-medium">Klik ikon tong sampah sekali untuk sedia, dan klik sekali lagi untuk sahkan pemadaman.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserManager;
