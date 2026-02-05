
import React, { useState, useEffect } from 'react';
import { LOGO_DATA } from '../../constants/logo';
import { storageService } from '../../services/storageService';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 'md' }) => {
  const [error, setError] = useState(false);
  const [currentLogo, setCurrentLogo] = useState<string>(storageService.getCustomLogo() || LOGO_DATA);

  useEffect(() => {
    const handleLogoChange = () => {
      setCurrentLogo(storageService.getCustomLogo() || LOGO_DATA);
      setError(false);
    };

    window.addEventListener('logoChanged', handleLogoChange);
    return () => window.removeEventListener('logoChanged', handleLogoChange);
  }, []);

  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  };

  const textMap = {
    sm: 'text-[8px]',
    md: 'text-[10px]',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  if (!currentLogo || error) {
    return (
      <div className={`${sizeMap[size]} ${className} relative flex items-center justify-center overflow-hidden rounded-full bg-slate-900 border-2 border-indigo-500/20 shadow-xl`}>
        <span className={`${textMap[size]} font-black text-white tracking-tighter`}>USTP</span>
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/20 to-transparent"></div>
      </div>
    );
  }

  return (
    <div className={`${sizeMap[size]} ${className} relative flex items-center justify-center overflow-hidden rounded-full bg-white p-0.5 shadow-sm`}>
      <img 
        src={currentLogo} 
        alt="Logo Sistem" 
        className="w-full h-full object-contain"
        onError={() => setError(true)}
      />
    </div>
  );
};

export default Logo;
