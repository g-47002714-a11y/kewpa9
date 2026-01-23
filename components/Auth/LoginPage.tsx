
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '../../types';
import { storageService } from '../../services/storageService';

interface Props {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const MASTER_ADMIN_EMAILS = [
    'admin@gov.my',
    'pengurus@gov.my',
    'ketua_unit@gov.my'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const cleanEmail = email.trim().toLowerCase();
    const cleanInputPassword = password.trim();

    // 1. Logik Pentadbir Utama (Hardcoded)
    if (MASTER_ADMIN_EMAILS.includes(cleanEmail) && cleanInputPassword === 'admin123') {
      const adminUser: User = {
        id: 'master-admin',
        name: 'Pentadbir Sistem',
        email: cleanEmail,
        designation: 'Pegawai Pentadbir',
        department: 'Unit Pengurusan Aset',
        verified: true,
        isAdmin: true
      };
      onLogin(adminUser);
      navigate('/');
      return;
    }

    try {
      const users = await storageService.getUsers();
      const user = users.find(u => u.email && u.email.toLowerCase().trim() === cleanEmail);

      if (user) {
        // 2. Semak kata laluan dengan Safe String Comparison
        // Menukar data dari Sheets kepada String sekiranya ia dikesan sebagai Number
        const savedPassword = user.password ? String(user.password).trim() : '';
        
        if (savedPassword && savedPassword !== cleanInputPassword) {
          setError('Kata laluan salah. Sila cuba lagi.');
        } else if (!user.verified) {
          setError('Akaun anda belum disahkan oleh Admin.');
        } else {
          const isAdmin = String(user.isAdmin).toUpperCase() === 'TRUE' || user.isAdmin === true;
          onLogin({ ...user, isAdmin });
          navigate('/');
        }
      } else {
        setError('E-mel tidak dijumpai. Sila daftar akaun baru.');
      }
    } catch (e) {
      setError('Gagal menghubungi Google Sheets. Sila periksa sambungan internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
        <div className="text-center mb-10">
          <div className="bg-indigo-600 w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 text-white text-2xl shadow-xl shadow-indigo-100 rotate-3">
            <i className="fas fa-file-invoice"></i>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">KEW.PA-9 <span className="text-indigo-600">Digital</span></h1>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.2em] mt-1">Sistem Pinjaman Aset</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 text-rose-700 text-xs font-bold rounded-2xl border border-rose-100 flex items-start space-x-3">
            <i className="fas fa-exclamation-circle mt-0.5"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-mel Rasmi</label>
            <div className="relative">
              <i className="fas fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                placeholder="nama@jabatan.gov.my"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Kata Laluan</label>
            <div className="relative">
              <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center space-x-3 shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50"
          >
            {loading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-sign-in-alt"></i>}
            <span>Log Masuk Sistem</span>
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500 font-medium">
            Pengguna baru? <Link to="/register" className="text-indigo-600 font-bold hover:underline">Daftar Akaun Jabatan</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
