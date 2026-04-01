import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const Input = forwardRef(({ className, type = "text", error, label, ...props }, ref) => {
  return (
    <div className="w-full mb-4">
      {label && (
        <label className="block tracking-[0.05em] uppercase text-text-sec text-xs font-medium mb-1.5">
          {label}
        </label>
      )}
      <input
        type={type}
        className={cn(
          "input-field",
          error && "error",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-danger">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
