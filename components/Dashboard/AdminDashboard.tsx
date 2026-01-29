
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, KEWPA9Form, LoanStatus } from '../../types';
import { storageService } from '../../services/storageService';

interface Props {
  user: User;
  onLogout: () => void;
}

const COE_OPTIONS = [
  "CoE AIR HITAM",
  "CoE PARIT RAJA",
  "CoE YONG PENG",
  "CoE SERI MEDAN",
  "CoE SENGGARANG",
  "CoE PENGGARAM",
  "CoE TONGKANG PECHAH",
  "CoE BAGAN",
  "CoE PARIT SULONG"
];

const AdminDashboard: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [allForms, setAllForms] = useState<KEWPA9Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<LoanStatus | 'ALL'>(LoanStatus.PENDING);
  const [coeFilter, setCoeFilter] = useState<string>('ALL');
  const [selectedForm, setSelectedForm] = useState<KEWPA9Form | null>(null);
  const [remarks, setRemarks] = useState('');

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

  const getMicroSignature = (): string => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return '';
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    tempCanvas.width = 150;
    tempCanvas.height = 45;
    if (ctx) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
      return tempCanvas.toDataURL('image/jpeg', 0.1);
    }
    return '';
  };

  const startDrawing = (e: any) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleAction = async (status: LoanStatus) => {
    if (!selectedForm) return;
    setProcessing(true);
    const sigData = getMicroSignature();

    try {
      const updatedForm: KEWPA9Form = {
        ...selectedForm,
        status: status,
        approverName: user.name, 
        approverDate: new Date().toISOString().split('T')[0],
        remarks: remarks
      };

      const regNos = String(selectedForm.registrationNo || '').split(',').map(r => r.trim());

      if (status === LoanStatus.APPROVED) {
        updatedForm.adminSignature = sigData;
        for (const reg of regNos) {
          if (reg) await storageService.updateAssetStatus(reg, 'LOANED');
        }
      } else if (status === LoanStatus.COMPLETED) {
        updatedForm.returnAdminSignature = sigData;
        for (const reg of regNos) {
          if (reg) await storageService.updateAssetStatus(reg, 'AVAILABLE');
        }
      }

      await storageService.saveForm(updatedForm);
      await loadAllForms();
      setSelectedForm(null);
      setRemarks('');
    } catch (error) {
      alert("Gagal mengemaskini data.");
    } finally {
      setProcessing(false);
    }
  };

  const filteredForms = allForms.filter(f => {
    const matchStatus = filter === 'ALL' || f.status === filter;
    const matchCoe = coeFilter === 'ALL' || f.coe === coeFilter;
    return matchStatus && matchCoe;
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white p-4 h-16 flex items-center justify-between shadow-lg">
        <h1 className="text-lg font-black tracking-tighter uppercase">KEW.PA-9 <span className="text-indigo-400">ADMIN</span></h1>
        <div className="flex space-x-6 text-[10px] font-black uppercase tracking-widest">
          <Link to="/" className="text-white border-b-2 border-indigo-400 pb-1">Tugasan</Link>
          <Link to="/admin/assets" className="text-slate-400 hover:text-white transition-colors">Inventori</Link>
          <Link to="/admin/users" className="text-slate-400 hover:text-white transition-colors">Pengguna</Link>
        </div>
        <button onClick={onLogout} className="text-rose-400 hover:text-rose-300 transition-colors"><i className="fas fa-power-off"></i></button>
      </header>

      <main className="max-w-6xl mx-auto w-full p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Senarai Menunggu Tindakan</h2>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select 
                value={coeFilter}
                onChange={(e) => setCoeFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 outline-none focus:border-indigo-400 shadow-sm appearance-none pr-10"
              >
                <option value="ALL">SEMUA CoE</option>
                {COE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[8px]"></i>
            </div>

            <div className="flex bg-white rounded-xl p-1 border shadow-sm">
              {[LoanStatus.PENDING, LoanStatus.RETURNING, 'ALL'].map(s => (
                <button key={s} onClick={() => setFilter(s as any)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filter === s ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Peminjam</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aset & No. Siri</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredForms.length === 0 ? (
                  <tr>
                     <td colSpan={4} className="px-8 py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">Tiada Rekod Dijumpai</td>
                  </tr>
                ) : (
                  filteredForms.map(form => (
                    <tr key={form.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-5">
                        <p className="font-black text-slate-800">{form.borrowerName}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">ID: {form.id}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="font-bold text-slate-700">
                          {form.items && form.items.length > 0 
                            ? `${form.items[0].name}${form.items.length > 1 ? ` (+${form.items.length - 1} lain)` : ''}`
                            : String(form.assetName || '-')
                          }
                        </p>
                        <p className="text-[10px] font-mono font-bold text-indigo-500 mb-1">{String(form.registrationNo || '')}</p>
                        {form.coe && (
                          <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter shadow-sm">
                            <i className="fas fa-map-marker-alt mr-1"></i> {form.coe}
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase ${
                          form.status === LoanStatus.RETURNING ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                          form.status === LoanStatus.APPROVED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                          form.status === LoanStatus.REJECTED ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          form.status === LoanStatus.COMPLETED ? 'bg-slate-100 text-slate-500 border-slate-200' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>{form.status}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link 
                            to={`/form/print/${form.id}`} 
                            title="Cetak KEW.PA-9"
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-100 transition-all active:scale-95 flex-shrink-0"
                          >
                            <i className="fas fa-print"></i>
                          </Link>
                          {(form.status === LoanStatus.PENDING || form.status === LoanStatus.RETURNING) && (
                            <button onClick={() => setSelectedForm(form)} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md active:scale-95 whitespace-nowrap">SEMAK</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {selectedForm && (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] max-w-lg w-full p-8 overflow-y-auto max-h-[90vh] shadow-2xl animate-in zoom-in duration-300">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-black uppercase tracking-tighter">Pengesahan Admin</h3>
               <button onClick={() => setSelectedForm(null)} className="text-slate-300 hover:text-slate-600 transition-colors"><i className="fas fa-times text-xl"></i></button>
             </div>

             <div className="space-y-6">
                <div className="bg-slate-50 p-5 rounded-3xl text-xs space-y-2 border border-slate-100 shadow-inner">
                  <p><strong className="uppercase text-slate-400 tracking-widest mr-2">Peminjam:</strong> <span className="font-bold text-slate-800">{selectedForm.borrowerName}</span></p>
                  <p><strong className="uppercase text-slate-400 tracking-widest mr-2">Aset:</strong> <span className="font-bold text-slate-800">{selectedForm.assetName}</span></p>
                  <p><strong className="uppercase text-slate-400 tracking-widest mr-2">Lokasi CoE:</strong> <span className="font-bold text-indigo-600">{selectedForm.coe || '-'}</span></p>
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catatan</label>
                   <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-indigo-500 outline-none" rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Masukkan ulasan..." />
                </div>

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest ml-1">Tandatangan Pengesahan</label>
                   <div className="border-2 border-dashed border-slate-200 rounded-3xl h-40 bg-white relative overflow-hidden shadow-inner">
                      <canvas ref={signatureCanvasRef} width={600} height={160} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={() => setIsDrawing(false)} className="absolute inset-0 w-full h-full touch-none" />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  {selectedForm.status === LoanStatus.PENDING ? (
                    <>
                      <button onClick={() => handleAction(LoanStatus.REJECTED)} disabled={processing} className="py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-100 transition-all">Tolak</button>
                      <button onClick={() => handleAction(LoanStatus.APPROVED)} disabled={processing} className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">Lulus</button>
                    </>
                  ) : (
                    <button onClick={() => handleAction(LoanStatus.COMPLETED)} disabled={processing} className="col-span-2 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all">Sahkan Penerimaan Aset</button>
                  )}
                </div>
                {processing && <p className="text-center text-[10px] font-black text-indigo-500 animate-pulse uppercase tracking-widest mt-2">Menghantar ke Google Sheets...</p>}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
