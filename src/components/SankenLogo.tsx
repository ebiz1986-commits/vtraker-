import React from 'react';

interface SankenLogoProps {
  iconOnly?: boolean;
  className?: string; // class for the container
  iconSize?: 'sm' | 'md' | 'lg' | 'xl';
  subtitle?: string;
  shouldSpin?: boolean;
  shouldFade?: boolean;
}

export function SankenLogo({
  iconOnly = false,
  className = '',
  iconSize = 'md',
  subtitle,
  shouldSpin = false,
  shouldFade = false
}: SankenLogoProps) {
  // Logo image height based on size
  const heightClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-16',
    xl: 'h-20'
  };

  const subTextSizes = {
    sm: 'text-[8px]',
    md: 'text-[10px]',
    lg: 'text-sm',
    xl: 'text-[15px]'
  };

  const gapSizes = {
    sm: 'gap-2',
    md: 'gap-1.5',
    lg: 'gap-4',
    xl: 'gap-5'
  };

  const defaultSub = iconSize === 'xl' || iconSize === 'lg'
    ? 'Vehicle Tracking & Dispatch System'
    : 'Vehicle Tracking & Dispatch';

  const displaySubtitle = subtitle !== undefined ? subtitle : defaultSub;

  const logoImage = (
    <div
      className={`flex-shrink-0 rounded-lg bg-white px-3 py-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.35)] ${
        shouldSpin ? 'animate-spin' : shouldFade ? 'animate-professional-fade' : ''
      }`}
      style={shouldSpin ? { animationDuration: '16s' } : undefined}
    >
      <img
        src="/sanken-gen-logo.png"
        alt="Sanken Gen"
        className={`${heightClasses[iconSize]} w-auto object-contain select-none`}
        draggable={false}
      />
    </div>
  );

  if (iconOnly) {
    return logoImage;
  }

  return (
    <div className={`flex items-center ${gapSizes[iconSize]} ${className}`}>
      {logoImage}
      {displaySubtitle && (
        <p className={`font-bold tracking-widest uppercase transition-colors text-slate-400 select-none ${subTextSizes[iconSize]}`}>
          {displaySubtitle}
        </p>
      )}
    </div>
  );
}
