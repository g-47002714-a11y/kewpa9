
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, KEWPA9Form, LoanStatus } from '../../types';
import { storageService } from '../../services/storageService';
import Logo from '../UI/Logo';

interface Props {
  user: User;
  onLogout: () => void;
}

const AdminDashboard: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLCanvasElement>(null);
  
  const [allForms, setAllForms] = useState<KEWPA9Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<LoanStatus | 'ALL'>(LoanStatus.PENDING);
  
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState<KEWPA9Form | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Fail terlalu besar. Sila guna imej bawah 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        storageService.saveCustomLogo(reader.result as string);
        alert("Logo berjaya dikemaskini!");
      };
      reader.readAsDataURL(file);
    }
  };

  // Logik Tandatangan
  const startDrawing = (e: any) => {
    const canvas = signatureRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#000000';
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = signatureRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y); ctx.stroke();
  };

  const getSignatureData = () => {
    const canvas = signatureRef.current;
    if (!canvas) return '';
    return canvas.toDataURL('image/png');
  };

  const processDecision = async (status: LoanStatus) => {
    if (!selectedForm) return;
    const sig = getSignatureData();
    if (sig.length < 500 && status !== LoanStatus.REJECTED) {
      alert("Sila turunkan tandatangan pengesahan.");
      return;
    }

    setProcessing(true);
    try {
      const updatedForm: KEWPA9Form = {
        ...selectedForm,
        status: status,
        approverName: user.name,
        approverDate: new Date().toISOString().split('T')[0]
      };

      if (selectedForm.status === LoanStatus.RETURNING) {
        updatedForm.returnAdminSignature = sig;
        updatedForm.status = LoanStatus.COMPLETED;
      } else {
        updatedForm.adminSignature = sig;
      }

      await storageService.saveForm(updatedForm);

      // Kemaskini status aset dalam inventori
      const items = Array.isArray(selectedForm.items) ? selectedForm.items : [];
      for (const item of items) {
        let newAssetStatus: 'AVAILABLE' | 'LOANED' | 'MAINTENANCE' = 'AVAILABLE';
        if (status === LoanStatus.APPROVED) newAssetStatus = 'LOANED';
        if (status === LoanStatus.COMPLETED || status === LoanStatus.REJECTED) newAssetStatus = 'AVAILABLE';
        
        await storageService.updateAssetStatus(item.regNo, newAssetStatus);
      }

      await loadAllForms();
      setSelectedForm(null);
      alert(`Borang telah dikemaskini kepada: ${updatedForm.status}`);
    } catch (e) {
      alert("Ralat Cloud semasa menyimpan keputusan.");
    } finally {
      setProcessing(false);
    }
  };

  const filterOptions = [
    { id: LoanStatus.PENDING, label: 'Baru', color: 'text-amber-500' },
    { id: LoanStatus.APPROVED, label: 'Aktif', color: 'text-emerald-500' },
    { id: LoanStatus.RETURNING, label: 'Pulang', color: 'text-indigo-500' },
    { id: LoanStatus.COMPLETED, label: 'Selesai', color: 'text-slate-500' },
    { id: LoanStatus.REJECTED, label: 'Ditolak', color: 'text-rose-500' },
    { id: 'ALL', label: 'Semua', color: 'text-indigo-600' }
  ];

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
      <header className="bg-slate-900 text-white px-8 h-20 flex items-center justify-between shadow-2xl relative z-50">
        <div className="flex items-center space-x-4">
          <Logo size="sm" />
          <div className="hidden sm:block">
            <h1 className="text-lg font-black tracking-tighter uppercase leading-none">Command <span className="text-indigo-400">Center</span></h1>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">USTP Batu Pahat</p>
          </div>
        </div>

        <nav className="flex space-x-1">
          <Link to="/" className="px-5 py-2.5 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-400 border border-indigo-500/30">Pengesahan</Link>
          <Link to="/admin/assets" className="px-5 py-2.5 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors">Inventori</Link>
          <Link to="/admin/users" className="px-5 py-2.5 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors">Akses</Link>
          <button onClick={() => setShowBrandingModal(true)} className="px-5 py-2.5 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-400 transition-colors">Jenama</button>
        </nav>

        <button onClick={onLogout} className="text-slate-400 hover:text-rose-500 p-2 transition-colors">
          <i className="fas fa-power-off"></i>
        </button>
      </header>

      <main className="max-w-7xl mx-auto w-full p-6 md:p-10 flex-1">
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

        <section className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-10 py-8 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">Senarai Tugasan Pengesahan</h3>
            <div className="overflow-x-auto pb-2 xl:pb-0 scrollbar-hide">
              <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200 w-max">
                {filterOptions.map(opt => (
                  <button 
                    key={opt.id} onClick={() => setFilter(opt.id as any)}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${filter === opt.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {filter !== opt.id && <div className={`w-1.5 h-1.5 rounded-full ${opt.color.replace('text', 'bg')}`}></div>}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
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
                    <td colSpan={4} className="px-10 py-20 text-center text-slate-300 font-bold uppercase tracking-widest italic">Tiada rekod ditemui untuk status ini</td>
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
                          form.status === LoanStatus.COMPLETED ? 'bg-slate-100 text-slate-400 border-slate-200' :
                          form.status === LoanStatus.REJECTED ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>{form.status}</span>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <Link to={`/form/print/${form.id}`} title="Cetak KEW.PA-9" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-indigo-600 transition-all">
                            <i className="fas fa-print"></i>
                          </Link>
                          {(form.status === LoanStatus.PENDING || form.status === LoanStatus.RETURNING) && (
                            <button 
                              onClick={() => setSelectedForm(form)}
                              className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all active:scale-95"
                            >
                              Semak & Sah
                            </button>
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

      {/* MODAL SEMAK & SAH */}
      {selectedForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => !processing && setSelectedForm(null)}></div>
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 p-10 overflow-hidden border border-slate-100 animate-in zoom-in duration-300">
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase border mb-3 inline-block ${selectedForm.status === LoanStatus.RETURNING ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                  {selectedForm.status === LoanStatus.RETURNING ? 'Proses Pemulangan' : 'Permohonan Baru'}
                </span>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Semakan Pengesahan</h2>
              </div>
              <button onClick={() => setSelectedForm(null)} className="text-slate-300 hover:text-rose-500 transition-colors"><i className="fas fa-times text-2xl"></i></button>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Butiran Peminjam</p>
                <div className="space-y-2">
                  <p className="text-sm font-black text-slate-800">{(selectedForm as any).borrowerName}</p>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">{(selectedForm as any).borrowerDept}</p>
                  <p className="text-xs text-indigo-600 font-bold mt-2">Tujuan: <span className="text-slate-600 italic">{selectedForm.purpose}</span></p>
                </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Senarai Aset</p>
                <div className="max-h-24 overflow-y-auto space-y-2 scrollbar-thin">
                  {selectedForm.assetName?.split(', ').map((name, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                      <p className="text-xs font-bold text-slate-700">{name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tandatangan Pengesahan Admin</label>
                <button type="button" onClick={() => signatureRef.current?.getContext('2d')?.clearRect(0,0,800,200)} className="text-[10px] font-black text-rose-500 uppercase hover:underline">Padam Semula</button>
              </div>
              <div className="border-2 border-dashed border-slate-200 rounded-[2rem] h-40 bg-slate-50 relative overflow-hidden">
                <canvas 
                  ref={signatureRef} width={800} height={200} 
                  onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)}
                  onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={() => setIsDrawing(false)}
                  className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
                />
              </div>
            </div>

            <div className="flex space-x-4">
              {selectedForm.status === LoanStatus.RETURNING ? (
                <button 
                  disabled={processing} onClick={() => processDecision(LoanStatus.COMPLETED)}
                  className="flex-1 bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {processing ? <i className="fas fa-spinner animate-spin"></i> : 'Sahkan Pemulangan'}
                </button>
              ) : (
                <>
                  <button 
                    disabled={processing} onClick={() => processDecision(LoanStatus.REJECTED)}
                    className="flex-1 border-2 border-slate-200 text-slate-400 py-5 rounded-[2rem] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all disabled:opacity-50"
                  >
                    Tolak
                  </button>
                  <button 
                    disabled={processing} onClick={() => processDecision(LoanStatus.APPROVED)}
                    className="flex-[2] bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {processing ? <i className="fas fa-spinner animate-spin"></i> : 'Sah & Lulus Pinjaman'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PENGURUSAN JENAMA */}
      {showBrandingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowBrandingModal(false)}></div>
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl relative z-10 p-10 overflow-hidden border border-slate-100">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
                <i className="fas fa-palette text-2xl"></i>
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pengurusan Jenama</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Kemaskini Identiti Visual Sistem</p>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Pratonton Logo Semasa</p>
                <div className="flex justify-center mb-6">
                  <Logo size="lg" />
                </div>
                <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-indigo-600 transition-all active:scale-95 mb-3">Muat Naik Logo Baru</button>
                <button onClick={() => { if(window.confirm('Set semula logo kepada asal?')) storageService.resetLogo(); }} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">Set Semula Logo Asal</button>
              </div>
            </div>

            <button onClick={() => setShowBrandingModal(false)} className="mt-8 w-full py-4 border border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all">Tutup Panel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
