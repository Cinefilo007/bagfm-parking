import React from 'react';

export const Header = ({ titulo, subtitle, actionElement }) => {
  return (
    <header className="sticky top-0 z-[50] bg-bg-app/90 backdrop-blur-md pb-4 pt-6 px-4 border-b border-white/5 flex items-center justify-between">
      <div>
        {subtitle && (
          <p className="text-primary font-sans font-medium uppercase tracking-[0.1em] text-[10px] mb-1">
            {subtitle}
          </p>
        )}
        <h1 className="font-display font-bold text-2xl tracking-tight text-white leading-none">
          {titulo}
        </h1>
      </div>
      {actionElement && (
        <div className="flex-shrink-0 ml-4">
          {actionElement}
        </div>
      )}
    </header>
  );
};
