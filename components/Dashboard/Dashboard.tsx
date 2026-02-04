
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, KEWPA9Form, LoanStatus } from '../../types';
import { storageService } from '../../services/storageService';
import { geminiService } from '../../services/geminiService';

interface Props {
  user: User;
  onLogout: () => void;
}

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('T')[0].split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
};

const Dashboard: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [forms, setForms] = useState<KEWPA9Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [aiSummary, setAiSummary] = useState('Sistem sedang menganalisis rekod anda...');

  const loadForms = useCallback(async () => {
    setIsSyncing(true);
    try {
      const allForms = await storageService.getForms();
      const userForms = allForms.filter(f => f.userId === user.id);
      setForms(userForms);
      setLoading(false);
      setIsSyncing(false);
      return userForms;
    } catch (e) {
      setLoading(false);
      setIsSyncing(false);
      return [];
    }
  }, [user.id]);

  useEffect(() => {
    const init = async () => {
      const data = await loadForms();
      const pending = data.filter(f => f.status === LoanStatus.PENDING).length;
      const summary = await geminiService.getDashboardSummary(data.length, pending);
      setAiSummary(summary);
    };
    init();
  }, [user.id, loadForms]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-indigo-100 rounded-full"></div>
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="glass-card sticky top-0 z-40 px-6 h-20 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-100 bg-white flex items-center justify-center shadow-md">
            <img src="./logo.png" alt="USTP Logo" className="w-10 h-10 object-contain" onError={(e) => {
              (e.target as HTMLImageElement).src = "https://ui-avatars.com/api/?name=USTP&background=4f46e5&color=fff";
            }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">Portal <span className="text-indigo-600">Pinjaman</span></h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">USTP PPD Batu Pahat</p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="hidden md:block text-right">
            <p className="text-sm font-black text-slate-800">{user.name}</p>
            <p className="text-[10px] text-emerald-500 font-black uppercase">{user.designation}</p>
          </div>
          <button onClick={onLogout} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center">
            <i className="fas fa-power-off"></i>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        <section className="mb-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <h2 className="text-3xl font-black mb-4 tracking-tighter">Selamat Datang KembaIi.</h2>
              <div className="max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 mb-8">
                <p className="text-sm italic text-indigo-100">"{aiSummary}"</p>
              </div>
              <Link to="/form/new" className="inline-flex items-center space-x-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-xl active:scale-95">
                <i className="fas fa-plus"></i>
                <span>Mohon Aset</span>
              </Link>
            </div>
            <i className="fas fa-fingerprint absolute -right-10 -bottom-10 text-[15rem] text-white/5 opacity-20"></i>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-500 transition-all">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aset Aktif</p>
                <p className="text-4xl font-black text-slate-800">{forms.filter(f => f.status === LoanStatus.APPROVED).length}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                <i className="fas fa-box-open"></i>
              </div>
            </div>
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex items-center justify-between group hover:border-amber-500 transition-all">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Menunggu</p>
                <p className="text-4xl font-black text-slate-800">{forms.filter(f => f.status === LoanStatus.PENDING).length}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                <i className="fas fa-hourglass-half"></i>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-10 py-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center">
              <i className="fas fa-history mr-4 text-indigo-600"></i>
              Rekod Pinjaman Digital
            </h3>
            {isSyncing && <span className="text-[10px] font-black text-indigo-500 animate-pulse bg-indigo-50 px-4 py-2 rounded-full uppercase">Sinkronisasi Cloud...</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aset / No. Siri</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tempoh Pinjaman</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status Borang</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {forms.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-10 py-20 text-center">
                      <div className="max-w-xs mx-auto">
                        <i className="fas fa-folder-open text-4xl text-slate-100 mb-4"></i>
                        <p className="text-slate-400 font-bold text-sm">Tiada permohonan dibuat lagi. Mula dengan memohon aset baharu.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  forms.map(form => (
                    <tr key={form.id} className="group hover:bg-slate-50/80 transition-all cursor-default">
                      <td className="px-10 py-6">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${form.status === LoanStatus.APPROVED ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <i className="fas fa-desktop"></i>
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-sm">{form.assetName}</p>
                            <p className="text-[10px] font-mono font-bold text-slate-400 tracking-tighter uppercase">{form.registrationNo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <div className="inline-flex flex-col">
                          <span className="text-xs font-black text-slate-700">{formatDateDisplay(form.dateOut)}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Hingga {formatDateDisplay(form.dateExpectedIn)}</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-widest ${
                          form.status === LoanStatus.APPROVED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          form.status === LoanStatus.REJECTED ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          form.status === LoanStatus.RETURNING ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                          form.status === LoanStatus.COMPLETED ? 'bg-slate-100 text-slate-400 border-slate-200' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {form.status}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <Link to={`/form/print/${form.id}`} title="Cetak Borang" className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all">
                            <i className="fas fa-print"></i>
                          </Link>
                          {form.status === LoanStatus.APPROVED && (
                            <button onClick={() => navigate(`/form/edit/${form.id}?action=return`)} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-600 transition-all active:scale-95">Pulangkan</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
