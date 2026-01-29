
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { KEWPA9Form, User, LoanStatus, AssetItem } from '../../types';
import { storageService } from '../../services/storageService';

const formatDateDisplay = (dateStr: string | undefined) => {
  if (!dateStr || dateStr === '-' || dateStr === '') return '';
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = datePart.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// Pemetaan Nama Pengeluar mengikut CoE (Tagging Admin)
const COE_ADMINS: Record<string, string> = {
  "CoE SENGGARANG": "MOHD SA'ARI BIN MOHD SALLEH",
  "CoE PARIT RAJA": "MOHD RAHIMI BIN ABD TALIB",
  "CoE AIR HITAM": "TIADA",
  "CoE SERI MEDAN": "ZABIDI BIN SUKUAN",
  "CoE PENGGARAM": "ROSLAN BIN RAMLI",
  "CoE TONGKANG PECHAH": "NORAHSIKIN BINTI SALIM",
  "CoE YONG PENG": "NAZARUDIN BIN MUHAMMAD",
  "CoE PARIT SULONG": "ZUL AZRI BIN MISTAR",
  "CoE BAGAN": "FAZILAH BINTI MISRI"
};

const PrintPreview: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<KEWPA9Form | null>(null);
  const [borrower, setBorrower] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Check Cache
      const localData = localStorage.getItem("kewpa9_forms_cache");
      if (localData) {
        try {
          const localForms: KEWPA9Form[] = JSON.parse(localData);
          const found = localForms.find(f => f.id === id);
          if (found) {
            setForm(found);
            const session = localStorage.getItem('kewpa9_session');
            if (session) {
              const currentUser = JSON.parse(session);
              if (currentUser.id === found.userId) setBorrower(currentUser);
            }
          }
        } catch (e) {}
      }

      // 2. Sync Cloud
      try {
        const [allForms, allUsers] = await Promise.all([
          storageService.getForms(),
          storageService.getUsers()
        ]);

        const latestForm = allForms.find(f => f.id === id);
        if (latestForm) {
          setForm(latestForm);
          const user = allUsers.find(u => u.id === latestForm.userId);
          if (user) setBorrower(user);
        }
      } catch (err) {
      } finally {
        setIsSyncing(false);
      }
    };
    
    fetchData();
  }, [id]);

  const renderSignature = (sigData: any) => {
    if (!sigData || sigData === '-' || sigData === 'undefined' || sigData === '') {
      return <span className="text-[7px] text-slate-300 italic">Tiada rekod tandatangan</span>;
    }
    
    // 1. Tukar ke string dan bersihkan whitespace
    let cleanSig = String(sigData).trim();
    
    // 2. Buang petikan luar jika ada (cth: "data:image...")
    if (cleanSig.startsWith('"')) cleanSig = cleanSig.substring(1);
    if (cleanSig.endsWith('"')) cleanSig = cleanSig.substring(0, cleanSig.length - 1);
    
    // 3. Buang escape character backslash yang ditambah oleh JSON stringify
    cleanSig = cleanSig.replace(/\\/g, ''); 
    
    // 4. Validasi panjang (base64 signature biasanya > 1000 aksara)
    if (cleanSig.length < 50) return <span className="text-[7px] text-slate-300 italic">Data tidak sah</span>;

    return (
      <div className="w-full h-full flex items-center justify-center p-0.5">
        <img 
          src={cleanSig} 
          alt="Sig" 
          className="max-w-full max-h-full object-contain block" 
          style={{ mixBlendMode: 'multiply' }}
          onError={(e) => {
            // Jika gambar gagal dimuat, sorokkan elemen ini
            (e.target as HTMLImageElement).style.opacity = '0';
          }}
        />
      </div>
    );
  };

  if (!form) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const isApproved = form.status !== LoanStatus.PENDING && form.status !== LoanStatus.REJECTED;
  const isReturningOrDone = form.status === LoanStatus.RETURNING || form.status === LoanStatus.COMPLETED;
  const isCompleted = form.status === LoanStatus.COMPLETED;
  
  // Ambil senarai item. Jika dalam format string (dari Sheets), parse kepada Array.
  let itemsToRender: AssetItem[] = [];
  try {
    if (Array.isArray(form.items)) {
      itemsToRender = form.items;
    } else if (typeof form.items === 'string' && (form.items as string).startsWith('[')) {
      itemsToRender = JSON.parse(form.items);
    }
  } catch (e) {
    console.error("Gagal parse items:", e);
  }

  // Jika tiada items (rekod lama), gunakan data gabungan sebagai satu row
  if (itemsToRender.length === 0) {
    const names = String(form.assetName || '-').split(', ');
    const regs = String(form.registrationNo || '-').split(', ');
    
    // Cuba pecahkan balik jika jumlah sepadan
    if (names.length === regs.length && names.length > 0) {
      itemsToRender = names.map((name, i) => ({ name, regNo: regs[i] }));
    } else {
      itemsToRender = [{ name: form.assetName || '-', regNo: form.registrationNo || '-' }];
    }
  }

  // Tentukan Nama Pengeluar berdasarkan CoE
  const pengeluarName = form.coe ? (COE_ADMINS[form.coe] || '-') : '-';

  return (
    <div className="bg-slate-100 min-h-screen py-10 px-4">
      <div className="max-w-[21cm] mx-auto no-print mb-6 flex justify-between items-center">
        <button onClick={() => navigate('/')} className="bg-white px-4 py-2 rounded-lg border font-bold text-slate-600 shadow-sm hover:bg-slate-50 flex items-center">
          <i className="fas fa-chevron-left mr-2"></i>Kembali
        </button>
        <div className="flex items-center space-x-3">
          {isSyncing && <span className="text-[10px] font-black text-indigo-500 animate-pulse uppercase bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">Syncing...</span>}
          <button onClick={() => window.print()} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-emerald-700 active:scale-95">
            <i className="fas fa-print mr-2"></i>Cetak KEW.PA-9
          </button>
        </div>
      </div>

      <div className="max-w-[21cm] mx-auto bg-white p-[1.5cm] min-h-[29.7cm] text-black text-[10px] leading-tight print:p-0 print:shadow-none shadow-2xl">
        <div className="text-center font-bold text-xs mb-8 uppercase">BORANG PERMOHONAN PERGERAKAN/ PINJAMAN ASET ALIH (KEW.PA-9)</div>

        <table className="w-full border-collapse border border-black mb-6">
          <tbody>
            <tr>
              <td className="border border-black p-2 w-[20%] font-bold uppercase bg-slate-50">Nama Pemohon:</td>
              <td className="border border-black p-2 w-[30%] font-bold">{borrower?.name || form.borrowerName || '-'}</td>
              <td className="border border-black p-2 w-[20%] font-bold uppercase bg-slate-50">Tujuan:</td>
              <td className="border border-black p-2 w-[30%]">{form.purpose}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold uppercase bg-slate-50">Jawatan:</td>
              <td className="border border-black p-2">{borrower?.designation || '-'}</td>
              <td className="border border-black p-2 font-bold uppercase bg-slate-50">Tempat Digunakan:</td>
              <td className="border border-black p-2">{form.locationTo}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold uppercase bg-slate-50">Bahagian:</td>
              <td className="border border-black p-2">{borrower?.department || '-'}</td>
              <td className="border border-black p-2 font-bold uppercase bg-slate-50">Nama Pengeluar:</td>
              <td className="border border-black p-2 font-bold">{pengeluarName}</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full border-collapse border border-black mb-6 text-[9px]">
          <thead className="bg-slate-50 text-center font-bold">
            <tr>
              <td rowSpan={2} className="border border-black p-1 w-[5%]">Bil</td>
              <td rowSpan={2} className="border border-black p-1 w-[20%]">No. Siri Pendaftaran</td>
              <td rowSpan={2} className="border border-black p-1">Keterangan Aset</td>
              <td colSpan={2} className="border border-black p-1">Tarikh Pinjam</td>
              <td rowSpan={2} className="border border-black p-1 w-[8%]">Lulus</td>
              <td colSpan={2} className="border border-black p-1">Tarikh Pulang</td>
            </tr>
            <tr>
              <td className="border border-black p-1 w-[10%]">Mula</td>
              <td className="border border-black p-1 w-[10%]">Jangka</td>
              <td className="border border-black p-1 w-[10%]">Sebenar</td>
              <td className="border border-black p-1 w-[10%]">Sahkan</td>
            </tr>
          </thead>
          <tbody>
            {itemsToRender.map((item, idx) => (
              <tr key={idx} className="h-10">
                <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                <td className="border border-black p-1 font-mono text-[8px]">{item.regNo}</td>
                <td className="border border-black p-1 font-bold">{item.name}</td>
                <td className="border border-black p-1 text-center">{formatDateDisplay(form.dateOut)}</td>
                <td className="border border-black p-1 text-center">{formatDateDisplay(form.dateExpectedIn)}</td>
                <td className="border border-black p-1 text-center font-bold">
                  {isApproved ? 'YA' : (form.status === LoanStatus.REJECTED ? 'TIDAK' : '')}
                </td>
                <td className="border border-black p-1 text-center">{formatDateDisplay(form.dateActualIn)}</td>
                <td className="border border-black p-1 text-center">{isCompleted ? formatDateDisplay(form.approverDate) : ''}</td>
              </tr>
            ))}
            {/* Pad the table with a few empty rows if less than 3 items total */}
            {itemsToRender.length < 3 && Array(3 - itemsToRender.length).fill(0).map((_, i) => (
              <tr key={`empty-${i}`} className="h-10">
                <td className="border border-black p-1 text-center font-bold text-slate-200">{itemsToRender.length + i + 1}</td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-2 border border-black text-[9px] uppercase">
          <div className="border border-black p-4 flex flex-col justify-between min-h-[140px]">
            <div>
              <div className="h-14 w-full border-b border-dotted border-black mb-2 overflow-hidden flex items-center justify-center">
                {renderSignature(form.signature)}
              </div>
              <p className="font-bold">(Tandatangan Peminjam)</p>
            </div>
            <div className="mt-2 text-[8px]">
              <p><strong>Nama:</strong> {borrower?.name || form.borrowerName}</p>
              <p><strong>Tarikh:</strong> {formatDateDisplay(form.createdAt)}</p>
            </div>
          </div>

          <div className="border border-black p-4 flex flex-col justify-between min-h-[140px]">
            <div>
              <div className="h-14 w-full border-b border-dotted border-black mb-2 overflow-hidden flex items-center justify-center">
                {renderSignature(form.adminSignature)}
              </div>
              <p className="font-bold">(Tandatangan Pelulus - Admin)</p>
            </div>
            <div className="mt-2 text-[8px]">
              <p><strong>Nama:</strong> {isApproved ? (form.approverName || 'PENTADBIR ASET') : ''}</p>
              <p><strong>Tarikh:</strong> {isApproved ? formatDateDisplay(form.approverDate) : ''}</p>
            </div>
          </div>

          <div className="border border-black p-4 flex flex-col justify-between min-h-[140px]">
            <div>
              <div className="h-14 w-full border-b border-dotted border-black mb-2 overflow-hidden flex items-center justify-center">
                {renderSignature(form.returnUserSignature)}
              </div>
              <p className="font-bold">(Tandatangan Pemulang)</p>
            </div>
            <div className="mt-2 text-[8px]">
              <p><strong>Nama:</strong> {isReturningOrDone ? (borrower?.name || form.borrowerName) : ''}</p>
              <p><strong>Tarikh:</strong> {isReturningOrDone ? formatDateDisplay(form.dateActualIn) : ''}</p>
            </div>
          </div>

          <div className="border border-black p-4 flex flex-col justify-between min-h-[140px]">
            <div>
              <div className="h-14 w-full border-b border-dotted border-black mb-2 overflow-hidden flex items-center justify-center">
                {renderSignature(form.returnAdminSignature)}
              </div>
              <p className="font-bold">(Tandatangan Penerima - Admin)</p>
            </div>
            <div className="mt-2 text-[8px]">
              <p><strong>Nama:</strong> {isCompleted ? (form.approverName || 'PENTADBIR ASET') : ''}</p>
              <p><strong>Tarikh:</strong> {isCompleted ? formatDateDisplay(form.approverDate) : ''}</p>
            </div>
          </div>
        </div>

        <div className="mt-10 text-[7px] italic text-slate-400 text-right flex justify-between">
          <span>Dijana secara digital pada {new Date().toLocaleString()}</span>
          <span>Borang KEW.PA-9 Multi-Asset ID: {form.id}</span>
        </div>
      </div>
    </div>
  );
};

export default PrintPreview;
