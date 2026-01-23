
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { User, KEWPA9Form, LoanStatus } from '../../types';
import { storageService } from '../../services/storageService';
import { geminiService } from '../../services/geminiService';

interface Props {
  user: User;
  onLogout: () => void;
}

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '-';
  // Ambil bahagian tarikh sahaja sebelum 'T' jika ia adalah ISO string
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = datePart.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const AdminDashboard: React.FC<Props> = ({ user, onLogout }) => {
  const [allForms, setAllForms] = useState<KEWPA9Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<LoanStatus | 'ALL'>(LoanStatus.PENDING);
  const [selectedForm, setSelectedForm] = useState<KEWPA9Form | null>(null);
  const [remarks, setRemarks] = useState('');
  const [insights, setInsights] = useState('Menganalisis data...');

  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const loadAllForms = useCallback(async () => {
    try {
      const forms = await storageService.getForms();
      const users = await storageService.getUsers();
      const formsWithNames = forms.map(f => ({
        ...f,
        borrowerName: users.find(u => u.id === f.userId)?.name || 'Pengguna'
      }));
      setAllForms(formsWithNames);
      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAllForms(); }, [loadAllForms]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);
  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleAction = async (status: LoanStatus) => {
    if (!selectedForm) return;
    setProcessing(true);

    const canvas = signatureCanvasRef.current;
    const sigData = canvas ? canvas.toDataURL('image/png') : '';

    try {
      const updatedForm = {
        ...selectedForm,
        status: status,
        approverName: user.name,
        approverDate: new Date().toISOString().split('T')[0],
        remarks: remarks
      };

      if (status === LoanStatus.APPROVED) {
        updatedForm.adminSignature = sigData;
        await storageService.updateAssetStatus(selectedForm.registrationNo, 'LOANED');
      } else if (status === LoanStatus.COMPLETED) {
        updatedForm.returnAdminSignature = sigData;
        await storageService.updateAssetStatus(selectedForm.registrationNo, 'AVAILABLE');
      }

      await storageService.saveForm(updatedForm);
      await loadAllForms();
      setSelectedForm(null);
      setRemarks('');
    } catch (error) {
      alert("Ralat berlaku.");
    } finally {
      setProcessing(false);
    }
  };

  const filteredForms = filter === 'ALL' ? allForms : allForms.filter(f => f.status === filter);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white p-4 h-16 flex items-center justify-between shadow-xl">
        <div className="flex items-center space-x-6">
          <h1 className="text-lg font-black tracking-tighter">KEW.PA-9 <span className="text-indigo-400">ADMIN</span></h1>
          <nav className="flex space-x-6 text-[10px] font-black uppercase tracking-widest ml-4">
            <Link to="/" className="text-white border-b border-white pb-1">Permohonan</Link>
            <Link to="/admin/assets" className="text-slate-400 hover:text-white transition-colors">Inventori</Link>
            <Link to="/admin/users" className="text-slate-400 hover:text-white transition-colors">Pengguna</Link>
          </nav>
        </div>
        <button onClick={onLogout} className="text-rose-400 hover:text-rose-300 transition-colors">
          <i className="fas fa-sign-out-alt"></i>
        </button>
      </header>

      <main className="max-w-7xl mx-auto w-full p-4 md:p-8">
        <div className="flex items-center space-x-2 mb-6">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Pengurusan Pinjaman</h2>
          <div className="flex bg-white rounded-xl p-1 border border-slate-200 ml-auto">
             {[LoanStatus.PENDING, LoanStatus.RETURNING, 'ALL'].map(s => (
               <button key={s} onClick={() => setFilter(s as any)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${filter === s ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                 {s}
               </button>
             ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Peminjam</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aset</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredForms.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-slate-300 italic text-sm">Tiada permohonan dijumpai dalam kategori ini.</td>
                </tr>
              ) : (
                filteredForms.map(form => (
                  <tr key={form.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <p className="font-black text-slate-800">{form.borrowerName}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{form.id}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-700">{form.assetName}</p>
                      <p className="text-[10px] text-indigo-500 font-mono">{form.registrationNo}</p>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black border ${
                        form.status === LoanStatus.RETURNING ? 'bg-indigo-50 text-indigo-600 border-indigo-100 animate-pulse' : 
                        form.status === LoanStatus.PENDING ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>{form.status}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => setSelectedForm(form)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200">SEMAK & SAHKAN</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {selectedForm && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-xl w-full p-8 my-auto animate-in zoom-in duration-300">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                 {selectedForm.status === LoanStatus.RETURNING ? 'PENGESAHAN TERIMA ASET' : 'KELULUSAN PINJAMAN'}
               </h3>
               <button onClick={() => setSelectedForm(null)} className="text-slate-300 hover:text-slate-800"><i className="fas fa-times text-xl"></i></button>
             </div>

             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-xs">
                  <p><strong>Aset:</strong> {selectedForm.assetName}</p>
                  <p><strong>Siri:</strong> {selectedForm.registrationNo}</p>
                  <p><strong>Keluar:</strong> {formatDateDisplay(selectedForm.dateOut)}</p>
                  <p><strong>Jangka:</strong> {formatDateDisplay(selectedForm.dateExpectedIn)}</p>
                </div>

                {selectedForm.status === LoanStatus.PENDING && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Nota Peminjam</label>
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-50 text-sm italic text-indigo-900">"{selectedForm.purpose}"</div>
                  </div>
                )}

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Ulasan Admin / Catatan</label>
                   <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Tulis maklum balas di sini..." />
                </div>

                <div className="pt-2">
                   <div className="flex justify-between mb-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tandatangan Pengesahan Admin</label>
                      <button onClick={clearSignature} className="text-[10px] font-bold text-rose-500 uppercase">Padam</button>
                   </div>
                   <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-40 overflow-hidden relative cursor-crosshair">
                      <canvas ref={signatureCanvasRef} width={600} height={160} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="absolute inset-0 w-full h-full" />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  {selectedForm.status === LoanStatus.PENDING ? (
                    <>
                      <button onClick={() => handleAction(LoanStatus.REJECTED)} className="py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs uppercase hover:bg-rose-100 transition-all">Tolak / Bincang</button>
                      <button onClick={() => handleAction(LoanStatus.APPROVED)} className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all">Lulus & Sign</button>
                    </>
                  ) : (
                    <button onClick={() => handleAction(LoanStatus.COMPLETED)} className="col-span-2 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all flex items-center justify-center">
                      <i className="fas fa-check-double mr-2"></i> Sah Terima & Tutup Kes
                    </button>
                  )}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
