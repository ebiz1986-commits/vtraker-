import React from 'react';

interface SankenLogoProps {
  iconOnly?: boolean;
  className?: string; // class for the container
  iconSize?: 'sm' | 'md' | 'lg' | 'xl';
}

export function SankenLogo({ iconOnly = false, className = '', iconSize = 'md' }: SankenLogoProps) {
  // Dimensions based on icon size
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const svgSize = sizeClasses[iconSize];

  const logoIcon = (
    <div className={`relative ${svgSize} flex-shrink-0 flex items-center justify-center`}>
      <svg 
        viewBox="0 0 110 100" 
        className="w-full h-full overflow-visible"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sankenBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="40%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <filter id="sankenShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1.5" dy="2.5" stdDeviation="2" floodOpacity="0.4" floodColor="#070b14" />
          </filter>
        </defs>
        
        {/* Diamond 1 (Leftmost / Bottom layer) */}
        <rect 
          x="12" 
          y="30" 
          width="40" 
          height="40" 
          rx="5" 
          transform="rotate(45 32 50)" 
          fill="url(#sankenBlueGrad)" 
          stroke="#ffffff" 
          strokeWidth="1.8" 
          opacity="0.8" 
          filter="url(#sankenShadow)"
        />
        
        {/* Diamond 2 (Middle) */}
        <rect 
          x="32" 
          y="30" 
          width="40" 
          height="40" 
          rx="5" 
          transform="rotate(45 52 50)" 
          fill="url(#sankenBlueGrad)" 
          stroke="#ffffff" 
          strokeWidth="1.8" 
          opacity="0.85" 
          filter="url(#sankenShadow)"
        />
        
        {/* Diamond 3 (Rightmost / Top layer) */}
        <rect 
          x="52" 
          y="30" 
          width="40" 
          height="40" 
          rx="5" 
          transform="rotate(45 72 50)" 
          fill="url(#sankenBlueGrad)" 
          stroke="#ffffff" 
          strokeWidth="1.8" 
          opacity="0.95" 
          filter="url(#sankenShadow)"
        />
      </svg>
    </div>
  );

  if (iconOnly) {
    return logoIcon;
  }

  const textSizes = {
    sm: 'text-sm',
    md: 'text-[17px]',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const subTextSizes = {
    sm: 'text-[8px]',
    md: 'text-[10px]',
    lg: 'text-sm',
    xl: 'text-[15px]'
  };

  const gapSizes = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
    xl: 'gap-5'
  };

  return (
    <div className={`flex items-center ${gapSizes[iconSize]} ${className}`}>
      {logoIcon}
      <div className="flex flex-col select-none">
        <h1 
          className={`font-black tracking-tight leading-none uppercase font-sans ${textSizes[iconSize]} flex items-center gap-1`}
          style={{ letterSpacing: '0.05em' }}
        >
          <span className="text-white">Sanken</span>
          <span className="text-blue-400">Overseas</span>
        </h1>
        <p className={`font-bold tracking-widest uppercase transition-colors text-slate-400 ${subTextSizes[iconSize]}`}>
          Vehicle Tracker
        </p>
      </div>
    </div>
  );
}
