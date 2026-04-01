import React from 'react';
import { cn } from '../../lib/utils';

export const Card = ({ children, className, elevation = 2, hoverable = false, ...props }) => {
  // Manejador de elevación según Design System Aegis
  const elevaciones = {
    1: 'bg-bg-low',      // Capa 1: layout blocks
    2: 'bg-bg-card',     // Capa 2: Contenedores iterativos normales
    3: 'bg-bg-high',     // Capa 3: Cards interactuadas (hover en custom CSS)
    4: 'bg-bg-modal',    // Capa 4: Highest elevation
  };

  return (
    <div
      className={cn(
        "rounded-xl p-4 transition-colors duration-200",
        elevaciones[elevation] || elevaciones[2],
        hoverable && "cursor-pointer hover:bg-bg-high",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
