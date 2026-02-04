
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, KEWPA9Form, LoanStatus } from '../../types';
import { storageService } from '../../services/storageService';

interface Props {
  user: User;
  onLogout: () => void;
}

const AdminDashboard: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [allForms, setAllForms] = useState<KEWPA9Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LoanStatus | 'ALL'>(LoanStatus.PENDING);

  const loadAllForms = useCallback(async () => {
    try {
      const forms = await storageService.getForms();
      const users = await storageService.getUsers();
      const formsWithNames = forms.map(f => {
        const borrower = users.find(u => u.id === f.userId);
        return {
          ...f,
          borrowerName: borrower?.name || 'Rekod Tidak Dijumpai',
          borrowerDept: borrower?.department || '-'
        };
      });
      setAllForms(formsWithNames);
      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAllForms(); }, [loadAllForms]);

  const stats = {
    total: allForms.length,
    pending: allForms.filter(f => f.status === LoanStatus.PENDING).length,
    active: allForms.filter(f => f.status === LoanStatus.APPROVED).length,
    returning: allForms.filter(f => f.status === LoanStatus.RETURNING).length
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-white/10 rounded-full mb-4 mx-auto relative">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 -left-1"></div>
        </div>
        <p className="text-white text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Initializing Command Center</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Dark Sidebar-like Top Header */}
      <header className="bg-slate-900 text-white px-8 h-20 flex items-center justify-between shadow-2xl relative z-50">
        <div className="flex items-center space-x-6">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden border-2 border-slate-700">
            <img src="logo.png" alt="USTP Logo" className="w-10 h-10 object-contain" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-black tracking-tighter uppercase leading-none">Command <span className="text-indigo-400">Center</span></h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">USTP PPD Batu Pahat</p>
          </div>
        </div>

        <nav className="flex space-x-1">
          <Link to="/" className="px-5 py-2.5 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-400 border border-indigo-500/30">Pengesahan</Link>
          <Link to="/admin/assets" className="px-5 py-2.5 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors">Inventori</Link>
          <Link to="/admin/users" className="px-5 py-2.5 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors">Akses</Link>
        </nav>

        <button onClick={onLogout} className="text-slate-400 hover:text-rose-500 p-2 transition-colors">
          <i className="fas fa-power-off"></i>
        </button>
      </header>

      <main className="max-w-7xl mx-auto w-full p-6 md:p-10 flex-1">
        {/* Statistics Panels */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Jumlah Keseluruhan', val: stats.total, color: 'indigo', icon: 'fa-database' },
            { label: 'Permohonan Baharu', val: stats.pending, color: 'amber', icon: 'fa-plus-circle' },
            { label: 'Aset Di Luar', val: stats.active, color: 'emerald', icon: 'fa-truck-loading' },
            { label: 'Pemulangan', val: stats.returning, color: 'violet', icon: 'fa-undo-alt' }
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="relative z-10">
                <p className={`text-[10px] font-black text-${s.color}-500 uppercase tracking-widest mb-2`}>{s.label}</p>
                <p className="text-4xl font-black text-slate-800 tracking-tighter">{s.val}</p>
              </div>
              <i className={`fas ${s.icon} absolute -right-4 -bottom-4 text-6xl text-slate-50 group-hover:text-${s.color}-50 transition-colors`}></i>
            </div>
          ))}
        </section>

        {/* Action Table */}
        <section className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-10 py-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">Senarai Tugasan Pengesahan</h3>
            <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200">
              {[LoanStatus.PENDING, LoanStatus.RETURNING, 'ALL'].map(s => (
                <button 
                  key={s} onClick={() => setFilter(s as any)}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === s ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {s === 'ALL' ? 'SEJARAH' : s}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Peminjam</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Butiran Aset</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status Semasa</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allForms.filter(f => filter === 'ALL' || f.status === filter).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-10 py-20 text-center text-slate-300 font-bold uppercase tracking-widest italic">Pangkalan Data Bersih - Tiada Tugasan</td>
                  </tr>
                ) : (
                  allForms.filter(f => filter === 'ALL' || f.status === filter).map(form => (
                    <tr key={form.id} className="hover:bg-slate-50/80 transition-all">
                      <td className="px-10 py-6">
                        <p className="font-black text-slate-800">{(form as any).borrowerName}</p>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase">Unit: {(form as any).borrowerDept}</p>
                      </td>
                      <td className="px-10 py-6">
                        <p className="font-bold text-slate-700 leading-tight">{form.assetName}</p>
                        <p className="text-[10px] font-mono font-bold text-slate-400 mt-1 uppercase tracking-tighter">{form.registrationNo}</p>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border uppercase ${
                          form.status === LoanStatus.RETURNING ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                          form.status === LoanStatus.APPROVED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>{form.status}</span>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <Link to={`/form/print/${form.id}`} title="Cetak KEW.PA-9" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-indigo-600 transition-all">
                            <i className="fas fa-print"></i>
                          </Link>
                          {(form.status === LoanStatus.PENDING || form.status === LoanStatus.RETURNING) && (
                            <button className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all active:scale-95">Semak & Sah</button>
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

export default AdminDashboard;
