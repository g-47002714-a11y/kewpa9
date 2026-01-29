
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { User, KEWPA9Form, LoanStatus, AssetItem } from '../../types';
import { storageService } from '../../services/storageService';
import jsQR from "https://esm.sh/jsqr@1.4.0";

interface Props {
  user: User;
}

const COE_OPTIONS = [
  "CoE AIR HITAM", "CoE PARIT RAJA", "CoE YONG PENG", "CoE SERI MEDAN",
  "CoE SENGGARANG", "CoE PENGGARAM", "CoE TONGKANG PECHAH", "CoE BAGAN", "CoE PARIT SULONG"
];

const formatDateForInput = (dateStr: string | undefined): string => {
  if (!dateStr || dateStr === '-') return '';
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {}
  return '';
};

const FormEditor: React.FC<Props> = ({ user }) => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const isReturnMode = queryParams.get('action') === 'return';

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [showScanner, setShowScanner] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerCanvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Form State
  const [items, setItems] = useState<AssetItem[]>([]);
  const [currentItem, setCurrentItem] = useState<AssetItem>({ name: '', regNo: '' });
  const [formData, setFormData] = useState<Partial<KEWPA9Form>>({
    purpose: '',
    locationTo: '',
    coe: '',
    dateOut: '',
    dateExpectedIn: '',
    status: LoanStatus.PENDING,
  });

  useEffect(() => {
    const loadInitialData = async () => {
      if (id) {
        setFetching(true);
        try {
          const allForms = await storageService.getForms();
          const existing = allForms.find(f => f.id === id);
          if (existing) {
            setFormData(existing);
            
            // LOGIK PEMULIHAN ITEMS:
            // Data dari Cloud/Sheets mungkin datang sebagai string JSON
            let parsedItems: AssetItem[] = [];
            try {
              if (Array.isArray(existing.items)) {
                parsedItems = existing.items;
              } else if (typeof existing.items === 'string' && (existing.items as string).trim().startsWith('[')) {
                parsedItems = JSON.parse(existing.items);
              } else if (existing.assetName || existing.registrationNo) {
                // Fallback untuk rekod lama (single/joined names)
                const names = String(existing.assetName || '').split(', ');
                const regs = String(existing.registrationNo || '').split(', ');
                if (names.length === regs.length && names.length > 0 && names[0] !== '') {
                  parsedItems = names.map((name, i) => ({ name, regNo: regs[i] }));
                } else if (existing.assetName) {
                  parsedItems = [{ name: existing.assetName, regNo: existing.registrationNo || '' }];
                }
              }
            } catch (e) {
              console.error("Gagal memproses items:", e);
              if (existing.assetName) {
                parsedItems = [{ name: existing.assetName, regNo: existing.registrationNo || '' }];
              }
            }
            setItems(parsedItems);
          }
        } catch (err) {
          console.error("Gagal fetch data borang:", err);
        } finally {
          setFetching(false);
        }
      } else {
        const regNo = queryParams.get('regNo');
        const desc = queryParams.get('desc');
        if (regNo || desc) {
          setItems([{ name: desc || '', regNo: regNo || '' }]);
        }
      }
    };
    loadInitialData();
  }, [id, location.search]);

  const addItemToList = () => {
    if (!currentItem.name || !currentItem.regNo) {
      alert("Sila isi nama aset dan no. pendaftaran.");
      return;
    }
    setItems([...items, currentItem]);
    setCurrentItem({ name: '', regNo: '' });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const getMicroSignature = (): string => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return '';
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    tempCanvas.width = 150; tempCanvas.height = 45;
    if (ctx) {
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
      return tempCanvas.toDataURL('image/jpeg', 0.1);
    }
    return '';
  };

  const startScanner = async () => {
    setShowScanner(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        requestRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      alert("Kamera tidak dapat diakses.");
      setShowScanner(false);
    }
  };

  const stopScanner = () => {
    if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setShowScanner(false);
  };

  const scanFrame = () => {
    if (videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA) {
      const canvas = scannerCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          canvas.height = videoRef.current.videoHeight;
          canvas.width = videoRef.current.videoWidth;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            try {
              const url = new URL(code.data);
              const params = new URLSearchParams(url.hash.split('?')[1]);
              const regNo = params.get('regNo');
              const desc = params.get('desc');
              if (regNo && desc) {
                setItems(prev => [...prev, { name: desc, regNo: regNo }]);
                stopScanner();
                return;
              }
            } catch (e) {}
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(scanFrame);
  };

  const startDrawing = (e: any) => {
    const canvas = signatureCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#000000';
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y); ctx.stroke();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("Sila masukkan sekurang-kurangnya satu aset.");
      return;
    }
    setLoading(true);

    const sigData = getMicroSignature();
    
    // Join names for backward compatibility with simple sheet columns
    const allNames = items.map(i => i.name).join(', ');
    const allRegs = items.map(i => i.regNo).join(', ');

    const formToSave: KEWPA9Form = {
      ...formData as KEWPA9Form,
      id: id || Math.random().toString(36).substr(2, 9),
      userId: user.id,
      items: items,
      assetName: allNames,
      registrationNo: allRegs,
      borrowerName: user.name,
      status: isReturnMode ? LoanStatus.RETURNING : (formData.status || LoanStatus.PENDING),
    };

    if (isReturnMode) {
      formToSave.returnUserSignature = sigData;
      formToSave.dateActualIn = new Date().toISOString().split('T')[0];
    } else {
      formToSave.signature = sigData;
      formToSave.createdAt = formData.createdAt || new Date().toISOString().split('T')[0];
    }

    try {
      await storageService.saveForm(formToSave);
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      alert("Gagal menyimpan data ke Cloud.");
      setLoading(false);
    }
  };

  if (fetching) return <div className="h-screen flex items-center justify-center">Memuatkan data...</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 pb-20">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <Link to="/" className="text-indigo-600 hover:text-indigo-800 flex items-center space-x-2 font-bold">
            <i className="fas fa-chevron-left"></i>
            <span>Kembali</span>
          </Link>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
            {isReturnMode ? 'Pemulangan Aset' : 'Permohonan Pinjaman'}
          </h1>
        </header>

        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 px-8 py-5 flex justify-between items-center text-white">
            <p className="text-[10px] font-black uppercase tracking-widest">{isReturnMode ? 'Pengesahan Pemulangan' : 'Borang KEW.PA-9 Digital'}</p>
            {!isReturnMode && (
              <button type="button" onClick={startScanner} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg transition-all active:scale-95">
                <i className="fas fa-qrcode mr-2"></i>Imbas QR Aset
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {!isReturnMode ? (
              <div className="space-y-8">
                {/* Asset Add Section */}
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                    <i className="fas fa-plus-circle mr-2 text-indigo-500"></i>
                    Masukkan Maklumat Aset
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input 
                      placeholder="Nama Aset (cth: Laptop Dell)" 
                      className="px-4 py-3 border rounded-xl outline-none focus:border-indigo-500 text-sm font-bold"
                      value={currentItem.name}
                      onChange={e => setCurrentItem({...currentItem, name: e.target.value})}
                    />
                    <input 
                      placeholder="No. Pendaftaran (cth: KPM/XYZ/123)" 
                      className="px-4 py-3 border rounded-xl outline-none focus:border-indigo-500 text-sm font-mono"
                      value={currentItem.regNo}
                      onChange={e => setCurrentItem({...currentItem, regNo: e.target.value})}
                    />
                  </div>
                  <button type="button" onClick={addItemToList} className="w-full bg-indigo-100 text-indigo-600 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-200 transition-all active:scale-95">
                    Tambah Aset ke Senarai
                  </button>
                </div>

                {/* Added Assets List */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senarai Aset Dipohon ({items.length})</label>
                  {items.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-3xl py-8 text-center text-slate-300 italic text-xs font-bold uppercase tracking-widest">
                      Belum ada aset ditambah
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-2xl shadow-sm group">
                          <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-[10px]">{idx + 1}</div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm leading-tight">{item.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono font-bold uppercase">{item.regNo}</p>
                            </div>
                          </div>
                          <button type="button" onClick={() => removeItem(idx)} className="text-slate-300 hover:text-rose-500 transition-colors">
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Pilih CoE</label>
                    <select 
                      required className="w-full px-5 py-4 bg-slate-50 border rounded-2xl outline-none focus:border-indigo-500 appearance-none font-medium text-sm" 
                      value={formData.coe} 
                      onChange={e => setFormData({...formData, coe: e.target.value})}
                    >
                      <option value="">-- Sila Pilih --</option>
                      {COE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="col-span-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tujuan Pinjaman</label>
                    <textarea required className="w-full px-5 py-4 bg-slate-50 border rounded-2xl text-sm" rows={2} value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} placeholder="Sila nyatakan tujuan dengan jelas..." />
                  </div>
                  <div className="col-span-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tempat Digunakan (Spesifik)</label>
                    <input required className="w-full px-5 py-4 bg-slate-50 border rounded-2xl text-sm" value={formData.locationTo} onChange={e => setFormData({...formData, locationTo: e.target.value})} placeholder="cth: Bilik Gerakan Level 2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 col-span-full">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tarikh Pinjam</label>
                      <input type="date" required className="w-full px-5 py-4 bg-slate-50 border rounded-2xl text-sm" value={formatDateForInput(formData.dateOut)} onChange={e => setFormData({...formData, dateOut: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Jangka Pulang</label>
                      <input type="date" required className="w-full px-5 py-4 bg-slate-50 border rounded-2xl text-sm" value={formatDateForInput(formData.dateExpectedIn)} onChange={e => setFormData({...formData, dateExpectedIn: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 flex items-center space-x-4 shadow-inner">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl shadow-lg">
                  <i className="fas fa-undo"></i>
                </div>
                <div>
                  <p className="text-sm font-black text-indigo-900 uppercase tracking-tight">Sahkan Pemulangan Aset</p>
                  <p className="text-xs text-indigo-500 font-bold">{items.length} item akan direkodkan sebagai dipulangkan.</p>
                </div>
              </div>
            )}

            {/* Signature Section */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Tandatangan Digital</label>
                  <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest ml-1">Sila tandatangan di dalam kotak di bawah</p>
                </div>
                <button type="button" onClick={() => {
                  const ctx = signatureCanvasRef.current?.getContext('2d');
                  if (ctx) ctx.clearRect(0, 0, 800, 200);
                }} className="text-[10px] font-black text-rose-500 uppercase hover:underline mr-1">Padam Semula</button>
              </div>
              <div className="border-2 border-dashed border-slate-200 rounded-[2rem] h-48 relative overflow-hidden bg-white shadow-inner">
                <canvas ref={signatureCanvasRef} width={800} height={200} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={() => setIsDrawing(false)} className="absolute inset-0 w-full h-full touch-none cursor-crosshair" />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || items.length === 0} 
              className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-slate-200 active:scale-95"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <i className="fas fa-circle-notch animate-spin"></i>
                  <span>Sedang Menghantar...</span>
                </div>
              ) : (isReturnMode ? 'Sahkan & Hantar Pemulangan' : 'Hantar Permohonan Lengkap')}
            </button>
          </form>
        </div>
      </div>

      {showScanner && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-md">
          <div className="relative w-full max-w-sm aspect-square">
             <video ref={videoRef} className="w-full h-full object-cover rounded-[3rem] border-4 border-white/20" />
             <div className="absolute inset-x-0 top-0 h-1 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,1)] animate-scan"></div>
             <div className="absolute inset-0 border-4 border-dashed border-white/20 rounded-[3rem] pointer-events-none"></div>
          </div>
          <p className="mt-8 text-white font-black uppercase tracking-widest text-[10px] bg-white/10 px-6 py-2 rounded-full border border-white/5 animate-pulse">Halakan pada QR Aset</p>
          <canvas ref={scannerCanvasRef} className="hidden" />
          <button onClick={stopScanner} className="mt-8 text-white font-black uppercase tracking-widest bg-white/10 px-10 py-4 rounded-full hover:bg-white/20 border border-white/10 transition-all">Tutup Kamera</button>
        </div>
      )}
    </div>
  );
};

export default FormEditor;
