import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

export const NumberInput = ({ 
    label, 
    value, 
    onChange, 
    min = 0, 
    max = 999, 
    step = 1,
    className,
    disabled = false
}) => {
    const handleIncrement = () => {
        const nextVal = Math.min(max, (Number(value) || 0) + step);
        onChange(nextVal);
    };

    const handleDecrement = () => {
        const nextVal = Math.max(min, (Number(value) || 0) - step);
        onChange(nextVal);
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        if (val === '') {
            onChange(''); // Permitir vacío mientras se edita
            return;
        }
        const numericVal = parseInt(val);
        if (!isNaN(numericVal)) {
            onChange(Math.min(max, Math.max(min, numericVal)));
        }
    };

    return (
        <div className={cn("w-full mb-4", className)}>
            {label && (
                <label className="block tracking-[0.05em] text-text-sec text-[10px] font-black uppercase mb-1.5 opacity-70">
                    {label}
                </label>
            )}
            <div className="flex items-center gap-1 bg-bg-low/50 rounded-xl border border-bg-high/20 p-1 group focus-within:border-primary/40 transition-all">
                <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={disabled || (Number(value) || 0) <= min}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-bg-app text-text-muted hover:text-danger hover:bg-danger/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                >
                    <Minus size={14} />
                </button>
                
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={value}
                    onChange={handleInputChange}
                    disabled={disabled}
                    className="flex-1 bg-transparent border-none text-center font-display font-black text-lg text-text-main focus:outline-none focus:ring-0"
                />

                <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={disabled || (Number(value) || 0) >= max}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-bg-app text-text-muted hover:text-success hover:bg-success/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );
};
