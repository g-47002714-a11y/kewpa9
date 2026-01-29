
/* Fix: Added missing React hooks imports */
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, KEWPA9Form, LoanStatus } from '../../types';
import { storageService } from '../../services/storageService';
import { geminiService } from '../../services/geminiService';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Props {
  user: User;
  onLogout: () => void;
}

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '-';
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = datePart.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const Toast: React.FC<{ notification: Notification; onDismiss: (id: string) => void }> = ({ notification, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notification.id), 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const bgColors = {
    success: 'bg-emerald-500',
    error: 'bg-rose-500',
    info: 'bg-indigo-500'
  };

  return (
    <div className={`${bgColors[notification.type]} text-white px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-3 animate-bounce-in-right mb-3 transition-all transform hover:scale-105 pointer-events-auto`}>
      <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' : notification.type === 'error' ? 'fa-times-circle' : 'fa-info-circle'}`}></i>
      <p className="text-sm font-medium">{notification.message}</p>
      <button onClick={() => onDismiss(notification.id)} className="text-white/70 hover:text-white">
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};

const Dashboard: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [forms, setForms] = useState<KEWPA9Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSummary, setAiSummary] = useState('Mengumpul data terbaru...');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastSeenStatuses, setLastSeenStatuses] = useState<Record<string, LoanStatus>>({});

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const loadForms = useCallback(async (isInitial = false) => {
    if (!isInitial) setIsSyncing(true);
    try {
      const allForms = await storageService.getForms();
      const userForms = allForms.filter(f => f.userId === user.id);
      
      userForms.forEach(form => {
        const lastStatus = lastSeenStatuses[form.id];
        if (lastStatus && lastStatus !== form.status) {
          const type = form.status === LoanStatus.APPROVED ? 'success' : 
                       form.status === LoanStatus.REJECTED ? 'error' : 'info';
          addNotification(`Status "${form.assetName}" kini: ${form.status}`, type);
        }
      });

      const newStatuses: Record<string, LoanStatus> = {};
      userForms.forEach(f => newStatuses[f.id] = f.status);
      setLastSeenStatuses(newStatuses);
      
      setForms(userForms);
      setLoading(false);
      setIsSyncing(false);
      return userForms;
    } catch (e) {
      setLoading(false);
      setIsSyncing(false);
      return [];
    }
  }, [user.id, lastSeenStatuses, addNotification]);

  useEffect(() => {
    const initialLoad = async () => {
      const userForms = await loadForms(true);
      const pending = userForms.filter(f => f.status === LoanStatus.PENDING).length;
      const summary = await geminiService.getDashboardSummary(userForms.length, pending);
      setAiSummary(summary);
    };
    initialLoad();
  }, [user.id]);

  useEffect(() => {
    const interval = setInterval(() => { loadForms(); }, 15000);
    return () => clearInterval(interval);
  }, [loadForms]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Hapus rekod ini?')) {
      setIsSyncing(true);
      await storageService.deleteForm(id);
      setForms(forms.filter(f => f.id !== id));
      addNotification('Rekod dipadam.', 'info');
      setIsSyncing(false);
    }
  };

  const filteredForms = forms.filter(f => {
    const name = String(f.assetName || '').toLowerCase();
    const reg = String(f.registrationNo || '').toLowerCase();
    const search = searchQuery.toLowerCase();
    return name.includes(search) || reg.includes(search);
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getStatusBadge = (status: LoanStatus) => {
    const styles = {
      [LoanStatus.PENDING]: 'bg-amber-50 text-amber-600 border-amber-100',
      [LoanStatus.APPROVED]: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      [LoanStatus.REJECTED]: 'bg-rose-50 text-rose-600 border-rose-100',
      [LoanStatus.RETURNING]: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      [LoanStatus.COMPLETED]: 'bg-slate-100 text-slate-500 border-slate-200'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[status]}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4 bg-slate-50">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Menyusun Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10 backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500 p-2 rounded-xl text-white shadow-lg shadow-emerald-100">
              <i className="fas fa-file-signature"></i>
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">KEW.PA-9 <span className="text-emerald-500">Digital</span></h1>
            {isSyncing && <i className="fas fa-sync-alt animate-spin text-emerald-300 text-[10px] ml-2"></i>}
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800 leading-none mb-1">{user.name}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user.department}</p>
            </div>
            <button onClick={onLogout} title="Log Keluar" className="text-slate-300 hover:text-rose-500 p-2 transition-colors">
              <i className="fas fa-power-off"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-2 tracking-tighter uppercase">Pinjaman Digital</h2>
              <p className="text-slate-400 text-sm mb-6 max-w-md italic opacity-80">"{aiSummary}"</p>
              <Link to="/form/new" className="inline-flex items-center space-x-3 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95">
                <i className="fas fa-plus-circle"></i>
                <span>Mohon Pinjaman Baru</span>
              </Link>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
             <h3 className="font-bold text-slate-800 mb-4 uppercase text-xs tracking-widest text-slate-400">Ringkasan Status</h3>
             <div className="space-y-4 text-sm font-bold">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Dalam Pinjaman</span>
                  <span className="text-emerald-600">{forms.filter(f => f.status === LoanStatus.APPROVED).length} Aset</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Belum Dipulangkan</span>
                  <span className="text-amber-600">{forms.filter(f => f.status === LoanStatus.APPROVED || f.status === LoanStatus.RETURNING).length} Borang</span>
                </div>
             </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Butiran Pinjaman (Aset)</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tempoh</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredForms.length === 0 ? (
                   <tr><td colSpan={4} className="px-8 py-10 text-center text-slate-300 italic uppercase font-bold text-xs">Tiada rekod pinjaman dijumpai.</td></tr>
                ) : filteredForms.map(form => (
                  <tr key={form.id} className="group hover:bg-slate-50/50">
                    <td className="px-8 py-5">
                      <div className="flex items-start space-x-3">
                        <div className="bg-slate-100 p-2 rounded-xl text-slate-400 text-xs">
                          <i className="fas fa-boxes"></i>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 leading-tight">
                            {form.items && form.items.length > 0 
                              ? `${form.items[0].name}${form.items.length > 1 ? ` (+${form.items.length - 1} aset lain)` : ''}`
                              : String(form.assetName || '-')
                            }
                          </p>
                          <p className="text-[10px] text-indigo-500 font-mono font-bold">
                            {String(form.registrationNo || '').split(',')[0]}
                            {String(form.registrationNo || '').includes(',') ? '...' : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <p className="text-xs font-bold text-slate-700">{formatDateDisplay(form.dateOut)}</p>
                      <p className="text-[10px] text-slate-400 uppercase italic">Sehingga {formatDateDisplay(form.dateExpectedIn)}</p>
                    </td>
                    <td className="px-8 py-5 text-center">
                      {getStatusBadge(form.status)}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {form.status === LoanStatus.APPROVED && (
                          <button 
                            onClick={() => navigate(`/form/edit/${form.id}?action=return`)}
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-indigo-700 shadow-lg transition-all active:scale-95 whitespace-nowrap"
                          >
                            PULANG ASET
                          </button>
                        )}
                        <Link to={`/form/print/${form.id}`} title="Cetak Borang" className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-100 flex-shrink-0">
                          <i className="fas fa-print text-sm"></i>
                        </Link>
                        {form.status === LoanStatus.PENDING && (
                          <button onClick={() => handleDelete(form.id)} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-all flex-shrink-0">
                            <i className="fas fa-trash-alt text-sm"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none">
        {notifications.map(n => (
          <Toast key={n.id} notification={n} onDismiss={dismissNotification} />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
