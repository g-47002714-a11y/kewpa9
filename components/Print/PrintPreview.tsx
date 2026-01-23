
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { KEWPA9Form, User } from '../../types';
import { storageService } from '../../services/storageService';

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '-';
  // Ambil bahagian tarikh sahaja sebelum 'T' jika ia adalah ISO string (cth: 2024-01-11T...)
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = datePart.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const PrintPreview: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<KEWPA9Form | null>(null);
  const [borrower, setBorrower] = useState<User | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const allForms = await storageService.getForms();
      const existing = allForms.find(f => f.id === id);
      if (existing) {
        setForm(existing);
        const users = await storageService.getUsers();
        const user = users.find(u => u.id === existing.userId);
        if (user) setBorrower(user);
      }
    };
    fetchData();
  }, [id]);

  if (!form || !borrower) return <div className="p-8">Memuatkan borang...</div>;

  return (
    <div className="bg-slate-100 min-h-screen py-10 px-4">
      {/* Control Panel (Hidden in print) */}
      <div className="max-w-[24cm] mx-auto no-print mb-6 flex justify-between items-center">
        <button 
          onClick={() => navigate('/')}
          className="bg-white px-4 py-2 rounded-lg shadow-sm text-slate-600 hover:text-indigo-600 flex items-center space-x-2 border border-slate-200"
        >
          <i className="fas fa-chevron-left"></i>
          <span>Tutup</span>
        </button>
        <button 
          onClick={() => window.print()}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg shadow-md font-bold flex items-center space-x-2"
        >
          <i className="fas fa-print"></i>
          <span>Cetak Sekarang</span>
        </button>
      </div>

      {/* Official Form Area */}
      <div className="max-w-[24cm] mx-auto bg-white shadow-2xl p-[1cm] min-h-[29.7cm] text-black text-[11px] leading-tight print:shadow-none print:p-0">
        <div className="text-center font-bold text-sm mb-4 uppercase">BORANG PERMOHONAN PERGERAKAN/ PINJAMAN ASET ALIH</div>

        {/* Top Info Table */}
        <table className="w-full border-collapse border border-black mb-6">
          <tbody>
            <tr>
              <td className="border border-black p-2 w-[18%] font-bold text-rose-600">Nama Pemohon :</td>
              <td className="border border-black p-2 w-[32%]">{borrower.name}</td>
              <td className="border border-black p-2 w-[18%] font-bold text-rose-600">Tujuan :</td>
              <td className="border border-black p-2 w-[32%]">{form.purpose}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold text-rose-600">Jawatan :</td>
              <td className="border border-black p-2">{borrower.designation}</td>
              <td className="border border-black p-2 font-bold text-rose-600">Tempat Digunakan:</td>
              <td className="border border-black p-2">{form.locationTo}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold text-rose-600">Bahagian :</td>
              <td className="border border-black p-2">{borrower.department}</td>
              <td className="border border-black p-2 font-bold text-rose-600">Nama Pengeluar:</td>
              <td className="border border-black p-2">{form.approverName || '-'}</td>
            </tr>
          </tbody>
        </table>

        {/* Main Asset Table */}
        <table className="w-full border-collapse border border-black mb-6">
          <thead className="bg-slate-200 text-center font-bold">
            <tr>
              <td rowSpan={2} className="border border-black p-2 w-[4%]">Bil.</td>
              <td rowSpan={2} className="border border-black p-2 w-[12%]">No. Siri Pendaftaran</td>
              <td rowSpan={2} className="border border-black p-2 w-[18%]">Keterangan Aset</td>
              <td colSpan={2} className="border border-black p-1">Tarikh</td>
              <td rowSpan={2} className="border border-black p-1 w-[10%] text-rose-600">(Lulus/ Tidak Lulus)</td>
              <td colSpan={2} className="border border-black p-1">Tarikh</td>
              <td rowSpan={2} className="border border-black p-2 w-[10%]">Catatan</td>
            </tr>
            <tr>
              <td className="border border-black p-1 w-[8%]">Dipinjam</td>
              <td className="border border-black p-1 w-[8%]">Dijangka Pulang</td>
              <td className="border border-black p-1 w-[8%]">Dipulangkan</td>
              <td className="border border-black p-1 w-[8%]">Diterima</td>
            </tr>
          </thead>
          <tbody>
            {/* Row 1 - Data */}
            <tr className="min-h-[40px]">
              <td className="border border-black p-2 text-center">1</td>
              <td className="border border-black p-2 font-mono text-[10px]">{form.registrationNo}</td>
              <td className="border border-black p-2">{form.assetName}</td>
              <td className="border border-black p-2 text-center">{formatDateDisplay(form.dateOut)}</td>
              <td className="border border-black p-2 text-center">{formatDateDisplay(form.dateExpectedIn)}</td>
              <td className="border border-black p-2 text-center font-bold">
                {form.status === 'APPROVED' || form.status === 'COMPLETED' || form.status === 'RETURNING' ? 'LULUS' : 
                 form.status === 'REJECTED' ? 'TIDAK LULUS' : ''}
              </td>
              <td className="border border-black p-2 text-center">{form.dateActualIn ? formatDateDisplay(form.dateActualIn) : '-'}</td>
              <td className="border border-black p-2 text-center">{form.status === 'COMPLETED' ? formatDateDisplay(form.approverDate || '') : '-'}</td>
              <td className="border border-black p-2 italic">{form.remarks || ''}</td>
            </tr>
            {/* Empty rows to match the reference look */}
            {[...Array(8)].map((_, i) => (
              <tr key={i} className="h-8">
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signature Grid (4 Quadrants) */}
        <div className="grid grid-cols-2 border border-black">
          {/* Box 1: Peminjam */}
          <div className="border border-black p-4 min-h-[140px] flex flex-col justify-between">
            <div>
              <div className="border-b border-black border-dotted mb-1 w-full flex items-end min-h-[40px] justify-center">
                {form.signature && <img src={form.signature} alt="Sign" className="max-h-12 mix-blend-multiply" />}
              </div>
              <p className="text-rose-600 font-bold">(Tandatangan Peminjam)</p>
            </div>
            <div className="space-y-1 mt-2">
              <p><span className="text-rose-600 font-bold">Nama :</span> {borrower.name}</p>
              <p><span className="text-rose-600 font-bold">Jawatan :</span> {borrower.designation}</p>
              <p><span className="text-rose-600 font-bold">Tarikh :</span> {formatDateDisplay(form.createdAt)}</p>
            </div>
          </div>

          {/* Box 2: Pelulus */}
          <div className="border border-black p-4 min-h-[140px] flex flex-col justify-between">
            <div>
              <div className="border-b border-black border-dotted mb-1 w-full flex items-end min-h-[40px] justify-center">
                {form.adminSignature && <img src={form.adminSignature} alt="Admin Sign" className="max-h-12 mix-blend-multiply" />}
              </div>
              <p className="text-rose-600 font-bold">(Tandatangan Pelulus)</p>
            </div>
            <div className="space-y-1 mt-2">
              <p><span className="text-rose-600 font-bold">Nama :</span> {form.approverName || ''}</p>
              <p><span className="text-rose-600 font-bold">Jawatan :</span> {form.approverName ? 'Pegawai Aset' : ''}</p>
              <p><span className="text-rose-600 font-bold">Tarikh :</span> {form.approverDate ? formatDateDisplay(form.approverDate) : ''}</p>
            </div>
          </div>

          {/* Box 3: Pemulang */}
          <div className="border border-black p-4 min-h-[140px] flex flex-col justify-between">
            <div>
              <div className="border-b border-black border-dotted mb-1 w-full flex items-end min-h-[40px] justify-center">
                {form.returnUserSignature && <img src={form.returnUserSignature} alt="Return Sign" className="max-h-12 mix-blend-multiply" />}
              </div>
              <p className="text-rose-600 font-bold">(Tandatangan Pemulang)</p>
            </div>
            <div className="space-y-1 mt-2">
              <p><span className="text-rose-600 font-bold">Nama :</span> {form.returnUserSignature ? borrower.name : ''}</p>
              <p><span className="text-rose-600 font-bold">Jawatan :</span> {form.returnUserSignature ? borrower.designation : ''}</p>
              <p><span className="text-rose-600 font-bold">Tarikh :</span> {form.dateActualIn ? formatDateDisplay(form.dateActualIn) : ''}</p>
            </div>
          </div>

          {/* Box 4: Penerima */}
          <div className="border border-black p-4 min-h-[140px] flex flex-col justify-between">
            <div>
              <div className="border-b border-black border-dotted mb-1 w-full flex items-end min-h-[40px] justify-center">
                {form.returnAdminSignature && <img src={form.returnAdminSignature} alt="Receipt Sign" className="max-h-12 mix-blend-multiply" />}
              </div>
              <p className="text-rose-600 font-bold">(Tandatangan Penerima)</p>
            </div>
            <div className="space-y-1 mt-2">
              <p><span className="text-rose-600 font-bold">Nama :</span> {form.returnAdminSignature ? form.approverName : ''}</p>
              <p><span className="text-rose-600 font-bold">Jawatan :</span> {form.returnAdminSignature ? 'Pegawai Aset' : ''}</p>
              <p><span className="text-rose-600 font-bold">Tarikh :</span> {form.status === 'COMPLETED' ? formatDateDisplay(form.approverDate || '') : ''}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PrintPreview;
