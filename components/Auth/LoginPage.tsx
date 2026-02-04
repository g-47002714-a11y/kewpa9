
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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const MASTER_ADMIN_EMAILS = ['admin@gov.my', 'pengurus@gov.my', 'ketua_unit@gov.my'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const cleanEmail = email.trim().toLowerCase();
    const cleanInputPassword = password.trim();

    if (MASTER_ADMIN_EMAILS.includes(cleanEmail) && cleanInputPassword === 'admin123') {
      const adminUser: User = {
        id: 'master-admin',
        name: 'Pentadbir Utama',
        email: cleanEmail,
        designation: 'Pegawai Pentadbir',
        department: 'USTP PPD Batu Pahat',
        verified: true,
        isAdmin: true
      };
      onLogin(adminUser);
      navigate('/');
      setLoading(false);
      return;
    }

    try {
      const users = await storageService.getUsers();
      const user = users.find(u => String(u.email).toLowerCase().trim() === cleanEmail);

      if (user && String(user.password).trim() === cleanInputPassword) {
        const isVerified = String(user.verified).toUpperCase() === 'TRUE' || user.verified === true;
        if (!isVerified) {
          setError('Akaun anda belum diaktifkan oleh pentadbir.');
        } else {
          const isAdmin = String(user.isAdmin).toUpperCase() === 'TRUE' || user.isAdmin === true;
          onLogin({ ...user, isAdmin });
          navigate('/');
        }
      } else {
        setError('E-mel atau kata laluan tidak tepat.');
      }
    } catch (e) {
      setError('Masalah rangkaian. Sila cuba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
      <div className="absolute top-0 -left-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      <div className="max-w-md w-full glass-card rounded-[3rem] shadow-2xl p-10 relative z-10 border border-white/50">
        <div className="text-center mb-10">
          <div className="inline-flex w-24 h-24 rounded-full items-center justify-center mb-6 shadow-2xl animate-float overflow-hidden bg-white border-4 border-white">
            <img src="./logo.png" alt="USTP Logo" className="w-full h-full object-contain p-1" onError={(e) => {
              (e.target as HTMLImageElement).src = "https://ui-avatars.com/api/?name=USTP+BP&background=4f46e5&color=fff&size=128";
            }} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter mb-1">USTP <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600">KEW.PA-9</span></h1>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">PPD Batu Pahat</p>
          <div className="inline-block px-4 py-1.5 bg-indigo-50 rounded-full">
            <p className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em]">Sistem Pinjaman Aset Digital</p>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold flex items-center animate-shake">
            <i className="fas fa-circle-exclamation mr-3 text-lg"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Kredential Akses</label>
            <div className="group relative">
              <i className="fas fa-at absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"></i>
              <input 
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-14 pr-5 py-4 bg-white/50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-medium text-sm"
                placeholder="emel@jabatan.gov.my"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="group relative">
              <i className="fas fa-key absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"></i>
              <input 
                type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-14 pr-14 py-4 bg-white/50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-medium text-sm"
                placeholder="••••••••"
              />
              <button 
                type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors"
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-indigo-600 transition-all flex items-center justify-center space-x-3 shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <i className="fas fa-circle-notch animate-spin text-xl"></i>
            ) : (
              <>
                <span>Masuk Ke Portal</span>
                <i className="fas fa-arrow-right text-xs"></i>
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col space-y-4">
          <p className="text-xs text-slate-500 font-bold text-center uppercase tracking-widest">
            Tiada akaun? <Link to="/register" className="text-indigo-600 hover:underline">Daftar Baharu</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
