import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export const Boton = ({ 
  children, 
  variant = 'primario', 
  className, 
  isLoading, 
  disabled,
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-sans tracking-[0.05em] uppercase transition-all duration-200 min-h-[48px] px-6 py-[14px] rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primario: 'btn-primario',
    secundario: 'bg-transparent text-primary border border-text-muted/20 hover:bg-white/5 active:scale-95',
    destructivo: 'bg-gradient-to-br from-danger to-danger-deep text-[#FFDAD6] active:scale-95',
    ghost: 'bg-transparent text-text-sec hover:bg-white/5 hover:text-text-main',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], className)}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : null}
      {children}
    </button>
  );
};
