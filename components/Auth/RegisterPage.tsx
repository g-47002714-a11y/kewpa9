
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { storageService } from '../../services/storageService';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    designation: '',
    department: '',
  });
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [urlValid, setUrlValid] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setUrlValid(storageService.checkConnection());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPassword = formData.password.trim();
    const cleanConfirm = formData.confirmPassword.trim();
    const cleanEmail = formData.email.trim();

    if (!urlValid) {
      setError("URL Google Script tidak sah. Sila kemaskini storageService.ts");
      return;
    }

    if (cleanPassword.length < 6) {
      setError("Kata laluan mestilah sekurang-kurangnya 6 aksara.");
      return;
    }

    if (cleanPassword !== cleanConfirm) {
      setError("Kata laluan dan Sahkan Kata Laluan tidak sepadan.");
      return;
    }

    setLoading(true);
    
    const newUser = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name.trim(),
      email: cleanEmail,
      password: cleanPassword,
      designation: formData.designation.trim(),
      department: formData.department.trim(),
      verified: false,
      isAdmin: false
    };

    try {
      await storageService.saveUser(newUser);
      setIsRegistered(true);
    } catch (e) {
      setError("Gagal menyambung ke Google Cloud.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    try {
      const users = await storageService.getUsers();
      const user = users.find(u => u.email.toLowerCase().trim() === formData.email.toLowerCase().trim());
      if (user) {
        await storageService.updateUser({ ...user, verified: true });
        alert('Akaun anda telah diaktifkan secara manual!');
        window.location.hash = '/login';
      } else {
        setError('Data belum muncul di Google Sheets. Sila tunggu seminit.');
      }
    } catch (e) {
      setError("Gagal melakukan pengesahan Cloud.");
    } finally {
      setLoading(false);
    }
  };

  const copyEmailText = () => {
    const text = `Assalamualaikum / Salam Sejahtera ${formData.name},

Pendaftaran anda sedang diproses. Sila maklumkan kepada Pegawai Aset untuk pengesahan.

MAKLUMAT:
Unit: ${formData.department}
Jawatan: ${formData.designation}
Emel: ${formData.email}
Kata Laluan: ${formData.password}

Terima kasih.`;
    navigator.clipboard.writeText(text);
    alert('Teks notifikasi telah disalin!');
  };

  if (isRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-12">
        <div className="max-w-xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-500">
          <div className="bg-indigo-600 p-6 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-envelope-open-text text-2xl"></i>
            </div>
            <h2 className="text-xl font-bold">Pendaftaran Berjaya</h2>
            <p className="text-indigo-100 text-xs mt-1 uppercase tracking-widest font-bold">Salinan Rekod Pendaftaran</p>
          </div>
          
          <div className="p-8 md:p-10">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 md:p-8 text-slate-700 leading-relaxed text-sm md:text-base mb-8 shadow-inner">
              <p className="mb-4">Assalamualaikum / Salam Sejahtera <span className="font-bold text-slate-900">{formData.name}</span>,</p>
              
              <p className="mb-6">
                Pendaftaran anda sedang diproses. Sila maklumkan kepada <span className="font-bold">Pegawai Aset</span> untuk pengesahan akaun anda.
              </p>

              <div className="space-y-1 mb-6">
                <p className="font-bold text-slate-900 underline mb-2 tracking-wide uppercase text-xs">Maklumat Akaun:</p>
                <div className="grid grid-cols-[100px_1fr] gap-x-2">
                  <span className="text-slate-500">Unit:</span>
                  <span className="font-medium">{formData.department}</span>
                  
                  <span className="text-slate-500">Jawatan:</span>
                  <span className="font-medium">{formData.designation}</span>
                  
                  <span className="text-slate-500">Emel:</span>
                  <span className="font-medium">{formData.email}</span>
                  
                  <span className="text-slate-500 font-bold text-indigo-600">Password:</span>
                  <span className="font-black text-indigo-700 select-all">{formData.password}</span>
                </div>
              </div>

              <p>Terima kasih.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={copyEmailText}
                className="flex items-center justify-center space-x-2 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all border border-slate-200 active:scale-95"
              >
                <i className="fas fa-copy"></i>
                <span>Salin Teks Notifikasi</span>
              </button>
              
              <button 
                onClick={handleVerify}
                disabled={loading}
                className="flex items-center justify-center space-x-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 transition-all active:scale-95"
              >
                {loading ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-sign-in-alt"></i>}
                <span>Terus Log Masuk</span>
              </button>
            </div>

            <p className="text-center mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              * Sila simpan maklumat ini untuk rujukan anda.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl p-10 border border-slate-100">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[10px] font-bold uppercase tracking-widest flex items-center">
            <i className="fas fa-exclamation-triangle mr-3 text-lg"></i>
            {error}
          </div>
        )}

        <div className="text-center mb-10">
          <div className="bg-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-xl shadow-lg shadow-indigo-200">
            <i className="fas fa-user-plus"></i>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Daftar Pengguna</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nama Penuh</label>
            <input 
              required
              className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Ahmad Bin Ali"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Emel Jabatan</label>
            <input 
              type="email"
              required
              className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
              onChange={e => setFormData({...formData, email: e.target.value})}
              placeholder="nama@jabatan.gov.my"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Kata Laluan</label>
              <input 
                type="password"
                required
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
                onChange={e => setFormData({...formData, password: e.target.value})}
                placeholder="••••••"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Sahkan</label>
              <input 
                type="password"
                required
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                placeholder="••••••"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Jawatan</label>
              <input required placeholder="cth: PTPO" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm" onChange={e => setFormData({...formData, designation: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Unit</label>
              <input required placeholder="cth: ICT" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm" onChange={e => setFormData({...formData, department: e.target.value})} />
            </div>
          </div>
          
          <button 
            type="submit"
            disabled={loading || !urlValid}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl mt-4 flex items-center justify-center space-x-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-cloud-upload-alt"></i>}
            <span>Daftar Akaun Jabatan</span>
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
          Sudah Ada Akaun? <Link to="/login" className="text-indigo-600 hover:underline">Log Masuk</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
