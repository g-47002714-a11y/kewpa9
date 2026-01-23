
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { User, KEWPA9Form, LoanStatus } from '../../types';
import { storageService } from '../../services/storageService';
import { geminiService } from '../../services/geminiService';
import jsQR from "https://esm.sh/jsqr@1.4.0";

interface Props {
  user: User;
}

/**
 * Memastikan tarikh dalam format YYYY-MM-DD yang sangat ketat untuk input type="date"
 */
const formatDateForInput = (dateStr: string | undefined): string => {
  if (!dateStr || dateStr === '-') return '';
  
  try {
    // 1. Jika sudah dalam format YYYY-MM-DD (cth: 2024-05-20)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // 2. Jika ISO string (2024-01-11T16:00...)
    if (dateStr.includes('T')) {
      const isoDate = dateStr.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
    }

    // 3. Cuba parse menggunakan Date object
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.warn("Gagal memformat tarikh:", dateStr);
  }
  
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

  // Refs untuk input tarikh
  const dateOutRef = useRef<HTMLInputElement>(null);
  const dateInRef = useRef<HTMLInputElement>(null);

  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [formData, setFormData] = useState<Partial<KEWPA9Form>>({
    assetName: '',
    registrationNo: '',
    serialNo: '',
    purpose: '',
    locationTo: '',
    dateOut: '',
    dateExpectedIn: '',
    status: LoanStatus.PENDING,
  });

  useEffect(() => {
    const loadInitialData = async () => {
      if (id) {
        setFetching(true);
        const allForms = await storageService.getForms();
        const existing = allForms.find(f => f.id === id);
        if (existing) {
          setFormData(existing);
        }
        setFetching(false);
      } else {
        const regNo = queryParams.get('regNo');
        const desc = queryParams.get('desc');
        if (regNo || desc) {
          setFormData(prev => ({ ...prev, registrationNo: regNo || '', assetName: desc || '' }));
        }
      }
    };
    loadInitialData();
  }, [id, location.search]);

  const startScanner = async () => {
    setShowScanner(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();
        requestRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      alert("Gagal mengakses kamera. Sila berikan kebenaran.");
      setShowScanner(false);
    }
  };

  const stopScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setShowScanner(false);
  };

  const scanFrame = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = scannerCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          canvas.height = videoRef.current.videoHeight;
          canvas.width = videoRef.current.videoWidth;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
          
          if (code) {
            try {
              const url = new URL(code.data);
              const params = new URLSearchParams(url.hash.split('?')[1]);
              const regNo = params.get('regNo');
              const desc = params.get('desc');
              
              if (regNo || desc) {
                setFormData(prev => ({ ...prev, registrationNo: regNo || prev.registrationNo, assetName: desc || prev.assetName }));
                stopScanner();
                return;
              }
            } catch (e) {
              console.log("Bukan QR Code Sistem:", code.data);
            }
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(scanFrame);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const canvas = signatureCanvasRef.current;
    const signatureBase64 = canvas ? canvas.toDataURL('image/png') : '';
    const finalStatus = isReturnMode ? LoanStatus.RETURNING : (formData.status || LoanStatus.PENDING);
    
    const formToSave: KEWPA9Form = {
      id: id || Math.random().toString(36).substr(2, 9),
      userId: user.id,
      assetName: formData.assetName || '',
      registrationNo: formData.registrationNo || '',
      serialNo: formData.serialNo || '',
      purpose: formData.purpose || '',
      locationTo: formData.locationTo || '',
      dateOut: formData.dateOut || '',
      dateExpectedIn: formData.dateExpectedIn || '',
      status: finalStatus,
      createdAt: formData.createdAt || new Date().toISOString().split('T')[0],
      borrowerName: user.name,
      ...formData
    };

    if (isReturnMode) {
      formToSave.returnUserSignature = signatureBase64;
      formToSave.dateActualIn = new Date().toISOString().split('T')[0];
    } else {
      formToSave.signature = signatureBase64;
    }

    try {
      await storageService.saveForm(formToSave);
      navigate('/');
    } catch (err) {
      alert("Gagal menyimpan borang.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Pemicu manual yang lebih agresif
   */
  const triggerPicker = (ref: React.RefObject<HTMLInputElement>) => {
    if (ref.current) {
      try {
        ref.current.focus();
        if ('showPicker' in ref.current) {
          (ref.current as any).showPicker();
        }
      } catch (e) {
        console.log("Sila klik pada ikon kalendar.");
      }
    }
  };

  if (fetching) return <div className="h-screen flex items-center justify-center">Memuatkan...</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <Link to="/" className="text-indigo-600 hover:text-indigo-800 flex items-center space-x-2 font-bold">
            <i className="fas fa-chevron-left"></i>
            <span>Batal</span>
          </Link>
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">
            {isReturnMode ? 'Pemulangan Aset' : id ? 'Kemaskini Borang' : 'Pinjaman Aset Baru'}
          </h1>
        </header>

        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 px-8 py-5 flex justify-between items-center text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">{isReturnMode ? 'Bahagian III: Pemulangan' : 'Bahagian I: Permohonan'}</p>
            {!isReturnMode && !id && (
              <button 
                type="button" 
                onClick={startScanner}
                className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2"
              >
                <i className="fas fa-qrcode"></i>
                <span>Imbas QR Aset</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {!isReturnMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-full">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Keterangan Aset</label>
                  <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium" value={formData.assetName} onChange={e => setFormData({...formData, assetName: e.target.value})} placeholder="Cth: Laptop Dell Latitude" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">No. Siri Pendaftaran</label>
                  <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" value={formData.registrationNo} onChange={e => setFormData({...formData, registrationNo: e.target.value})} placeholder="Cth: KPM/BPP/H/23/102" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tempat Digunakan</label>
                  <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium" value={formData.locationTo} onChange={e => setFormData({...formData, locationTo: e.target.value})} placeholder="Cth: Bilik Mesyuarat Utama" />
                </div>
                <div className="col-span-full">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tujuan Pinjaman</label>
                  <textarea required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium" rows={3} value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} placeholder="Nyatakan sebab pinjaman dilakukan..." />
                </div>
                
                {/* DATE INPUTS SECTION - REBUILT FOR CLICKABILITY */}
                <div className="grid grid-cols-2 gap-4 col-span-full">
                   <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tarikh Pinjam</label>
                    <div 
                      className="relative h-14 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:bg-white hover:border-indigo-300 transition-all cursor-pointer group"
                      onClick={() => triggerPicker(dateOutRef)}
                    >
                      <i className="fas fa-calendar-alt absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 z-0 group-hover:text-indigo-500"></i>
                      <input 
                        ref={dateOutRef}
                        type="date" 
                        required 
                        className="absolute inset-0 w-full h-full pl-12 pr-4 bg-transparent outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 z-20 cursor-pointer opacity-100" 
                        value={formatDateForInput(formData.dateOut)} 
                        onChange={e => setFormData({...formData, dateOut: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jangka Pulang</label>
                    <div 
                      className="relative h-14 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:bg-white hover:border-indigo-300 transition-all cursor-pointer group"
                      onClick={() => triggerPicker(dateInRef)}
                    >
                      <i className="fas fa-calendar-check absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 z-0 group-hover:text-indigo-500"></i>
                      <input 
                        ref={dateInRef}
                        type="date" 
                        required 
                        className="absolute inset-0 w-full h-full pl-12 pr-4 bg-transparent outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 z-20 cursor-pointer opacity-100" 
                        value={formatDateForInput(formData.dateExpectedIn)} 
                        onChange={e => setFormData({...formData, dateExpectedIn: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-indigo-50 p-8 rounded-3xl border border-indigo-100 space-y-4">
                <div className="flex items-center space-x-3 text-indigo-600 mb-2">
                   <i className="fas fa-info-circle text-xl"></i>
                   <h4 className="font-black uppercase tracking-widest text-sm">Pengesahan Pemulangan</h4>
                </div>
                <p className="text-slate-700">Aset: <strong className="text-slate-900">{formData.assetName}</strong></p>
                <p className="text-slate-700">No. Siri: <strong className="font-mono text-indigo-600">{formData.registrationNo}</strong></p>
                <p className="text-[10px] text-indigo-400 font-black uppercase mt-6 italic">* Sila tandatangan di bawah untuk proses penyerahan balik aset ini kepada Pegawai Aset.</p>
              </div>
            )}

            <div className="col-span-full">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tandatangan Digital {isReturnMode ? '(Pemulangan)' : '(Peminjam)'}</label>
                <button type="button" onClick={clearSignature} className="text-[10px] font-black text-rose-500 uppercase hover:underline"><i className="fas fa-eraser mr-1"></i> Padam</button>
              </div>
              <div className="relative bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl h-48 overflow-hidden cursor-crosshair group">
                 <canvas ref={signatureCanvasRef} width={800} height={200} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="absolute inset-0 w-full h-full touch-none" />
                 <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-300 text-[10px] font-black uppercase tracking-[0.4em] opacity-50 group-hover:opacity-20 transition-opacity">
                   <i className="fas fa-pen-nib mr-2"></i> Lukis Tandatangan Di Sini
                 </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-indigo-600 active:scale-95 disabled:opacity-50 transition-all">
              {loading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-paper-plane mr-2"></i>}
              <span>{isReturnMode ? 'Hantar Pemulangan' : id ? 'Simpan Kemaskini' : 'Hantar Permohonan'}</span>
            </button>
          </form>
        </div>
      </div>

      {showScanner && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-6 backdrop-blur-md">
          <div className="relative w-full max-w-sm aspect-square bg-slate-900 rounded-[3rem] overflow-hidden border-4 border-white/20">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
            <canvas ref={scannerCanvasRef} className="hidden" />
            <div className="absolute inset-0 border-[40px] border-black/40"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-indigo-500 rounded-3xl shadow-[0_0_50px_rgba(99,102,241,0.5)]">
               <div className="absolute inset-x-0 top-0 h-1 bg-indigo-500/50 animate-scan"></div>
            </div>
            <div className="absolute bottom-10 left-0 right-0 text-center">
               <p className="text-white text-[10px] font-black uppercase tracking-[0.3em] bg-black/50 inline-block px-4 py-2 rounded-full backdrop-blur-sm">Halakan kamera ke QR Code Aset</p>
            </div>
          </div>
          <button onClick={stopScanner} className="mt-12 bg-white/10 hover:bg-white/20 text-white w-16 h-16 rounded-full flex items-center justify-center transition-all border border-white/20">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default FormEditor;
