
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Asset } from '../../types';
import { storageService } from '../../services/storageService';

const AssetManager: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedQR, setSelectedQR] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    registrationNo: '',
    description: ''
  });

  useEffect(() => {
    const loadAssets = async () => {
      const data = await storageService.getAssets();
      setAssets(data);
      setLoading(false);
    };
    loadAssets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newAsset: Asset = {
      id: Math.random().toString(36).substr(2, 9),
      registrationNo: formData.registrationNo,
      description: formData.description,
      status: 'AVAILABLE',
      createdAt: new Date().toISOString().split('T')[0]
    };
    await storageService.saveAsset(newAsset);
    setAssets([...assets, newAsset]);
    setFormData({ registrationNo: '', description: '' });
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Hapus aset ini dari Google Sheets secara kekal?')) {
      await storageService.deleteAsset(id);
      setAssets(assets.filter(a => a.id !== id));
    }
  };

  const generateQRUrl = (asset: Asset) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const loanUrl = `${baseUrl}#/form/new?regNo=${encodeURIComponent(asset.registrationNo)}&desc=${encodeURIComponent(asset.description)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(loanUrl)}&format=svg`;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <i className="fas fa-boxes animate-bounce text-indigo-600 text-3xl mb-4"></i>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Menyusun Inventori Cloud...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-10 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors">
              <i className="fas fa-chevron-left text-sm"></i>
            </Link>
            <h1 className="text-lg font-bold">Pengurusan Inventori</h1>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            <i className={`fas ${isAdding ? 'fa-times' : 'fa-plus'}`}></i>
            <span>{isAdding ? 'Batal' : 'Daftar Aset Baru'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 no-print">
        {isAdding && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 mb-10 animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center space-x-2">
              <i className="fas fa-plus-circle text-indigo-600"></i>
              <span>Pendaftaran Aset (KEW.PA-2/3)</span>
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">No. Siri Pendaftaran</label>
                <input 
                  required
                  placeholder="KPM/BPP/H/23/102"
                  className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono"
                  value={formData.registrationNo}
                  onChange={e => setFormData({...formData, registrationNo: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Keterangan Aset</label>
                <input 
                  required
                  placeholder="Laptop Dell Latitude 5420"
                  className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="md:col-span-2 flex justify-end pt-4">
                <button type="submit" className="bg-slate-900 text-white px-10 py-3 rounded-2xl font-bold shadow-xl hover:bg-slate-800 transition-all active:scale-95">
                  Sahkan & Daftar ke Google Sheets
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Helaian Inventori Aset</h3>
              <p className="text-xs text-slate-400">Menunjukkan status masa nyata (Real-time)</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block mb-1">Total Aset</span>
              <span className="text-2xl font-black text-slate-800">{assets.length}</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 w-24">QR</th>
                  <th className="px-8 py-5">No. Siri Pendaftaran</th>
                  <th className="px-8 py-5">Keterangan Aset</th>
                  <th className="px-8 py-5">Status Semasa</th>
                  <th className="px-8 py-5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                       <i className="fas fa-box-open text-4xl text-slate-200 mb-4 block"></i>
                       <p className="text-slate-400 italic">Tiada aset didaftarkan lagi.</p>
                    </td>
                  </tr>
                ) : (
                  assets.map(asset => (
                    <tr key={asset.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <button 
                          onClick={() => setSelectedQR(asset)}
                          className="hover:scale-125 transition-all bg-white p-2 border border-slate-200 rounded-xl shadow-sm group-hover:shadow-md"
                        >
                          <img 
                            src={generateQRUrl(asset)} 
                            alt="QR" 
                            className="w-10 h-10"
                          />
                        </button>
                      </td>
                      <td className="px-8 py-4">
                        <span className="font-mono text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded-md">{asset.registrationNo}</span>
                      </td>
                      <td className="px-8 py-4 text-sm font-bold text-slate-800">{asset.description}</td>
                      <td className="px-8 py-4">
                        <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${
                          asset.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          asset.status === 'LOANED' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          'bg-slate-50 text-slate-500 border-slate-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            asset.status === 'AVAILABLE' ? 'bg-emerald-500 animate-pulse' :
                            asset.status === 'LOANED' ? 'bg-blue-500' :
                            'bg-slate-400'
                          }`}></span>
                          <span>{asset.status}</span>
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(asset.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-all"
                        >
                          <i className="fas fa-trash-alt text-sm"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* QR Code Modal */}
      {selectedQR && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-sm w-full p-10 text-center animate-in zoom-in duration-300">
            <div className="mb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Label Aset Kerajaan</span>
              <h3 className="text-xl font-bold text-slate-800 mt-1">{selectedQR.description}</h3>
            </div>
            
            <div className="bg-white border-[12px] border-slate-900 p-6 inline-block rounded-[2.5rem] mb-8 shadow-2xl">
              <img src={generateQRUrl(selectedQR)} alt="Large QR" className="w-48 h-48 mx-auto" />
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl mb-8 border border-slate-100">
               <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">No. Pendaftaran</p>
               <p className="font-mono font-bold text-slate-800">{selectedQR.registrationNo}</p>
            </div>
            
            <div className="flex space-x-3">
              <button onClick={() => setSelectedQR(null)} className="flex-1 px-6 py-3 border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all">Tutup</button>
              <button onClick={() => window.print()} className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">Cetak Label</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetManager;
