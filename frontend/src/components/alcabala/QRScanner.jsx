import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, XCircle, RotateCcw } from 'lucide-react';
import { Boton } from '../ui/Boton';

export const QRScanner = ({ onScanSuccess, onScanError, autoStart = false }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [successFlash, setSuccessFlash] = useState(false);
  const html5QrCode = useRef(null);
  const readerRef = useRef(null);

  const startScanner = async () => {
    // Evitar múltiples instancias
    if (html5QrCode.current && (html5QrCode.current.isScanning || html5QrCode.current.getState() === 2)) return;
    
    try {
      setCameraError(null);
      setIsScanning(true);
      
      const qrCodeId = "reader-container";
      
      // Matar cualquier residuo previo
      if (html5QrCode.current) {
          try { await html5QrCode.current.clear(); } catch(e) {}
      }

      html5QrCode.current = new Html5Qrcode(qrCodeId);
      
      const config = {
        fps: 20,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
            const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7);
            return { width: size, height: size };
        },
        aspectRatio: 1.0,
        experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
        }
      };

      await html5QrCode.current.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          // 1. Feedback inmediato
          setSuccessFlash(true);
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          
          // 2. Notificación al padre (sin esperar al stop)
          // Usamos un flag para que el padre sepa que YA detectamos y no llame start() de nuevo
          onScanSuccess(decodedText);

          // 3. Limpieza asíncrona pero sin bloquear el flujo visual
          setTimeout(async () => {
              try {
                  if (html5QrCode.current && html5QrCode.current.isScanning) {
                    await html5QrCode.current.stop();
                    await html5QrCode.current.clear();
                  }
              } catch (e) {
                  console.warn("Error silent clearing:", e);
              }
              setIsScanning(false);
              setSuccessFlash(false);
          }, 300);
        },
        () => {} // Ignorar errores de frame
      );
    } catch (err) {
      console.error("ERROR CÁMARA:", err);
      setCameraError(`Fallo de dispositivo: ${err.message || 'Error desconocido'}`);
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (autoStart) {
      const timer = setTimeout(() => startScanner(), 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStart]);

  useEffect(() => {
    return () => {
      if (html5QrCode.current && html5QrCode.current.isScanning) {
        html5QrCode.current.stop().catch(() => {});
      }
    };
  }, []);

  const stopScanner = async () => {
    if (html5QrCode.current && html5QrCode.current.isScanning) {
      await html5QrCode.current.stop();
      setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto gap-6 p-4">
      {/* Contenedor persistente para evitar error removeChild */}
      <div 
        className={cn(
            "relative overflow-hidden rounded-3xl border-2 border-white/10 bg-black/20 shadow-xl w-full aspect-square flex items-center justify-center transition-all duration-500",
            !isScanning ? "opacity-0 scale-95 pointer-events-none absolute" : "opacity-100 scale-100"
        )}
      >
        <div id="reader-container" className="w-full h-full" />

        {/* Flash de Éxito al detectar */}
        {successFlash && (
          <div className="absolute inset-0 z-50 bg-primary/60 animate-in fade-in zoom-in duration-100" />
        )}

        {/* Marcador Táctico Overlay */}
        {isScanning && (
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-primary/20 rounded-2xl relative">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg scale-110"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg scale-110"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg scale-110"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg scale-110"></div>
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/70 animate-scan" />
            </div>
          </div>
        )}
      </div>

      {!isScanning && !cameraError && (
        <div className="flex flex-col items-center gap-4 text-center py-12">
          <div className="w-24 h-24 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mb-2 border border-primary/10 animate-pulse-slow">
            <Camera className="text-primary/40" size={40} />
          </div>
          <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Sensor Inactivo</h3>
          <p className="text-text-muted text-xs px-12 font-bold uppercase tracking-widest leading-relaxed opacity-60">
            Aegis requiere activación manual del sensor óptico para procesar credenciales.
          </p>
          <Boton onClick={startScanner} variant="primario" className="mt-6 px-12 h-16 rounded-2xl text-lg font-black flex items-center gap-4">
             <Camera size={24} /> Activar Radar
          </Boton>
        </div>
      )}

      {cameraError && (
        <div className="flex flex-col items-center gap-4 text-center py-10 bg-error/5 rounded-[2rem] border border-error/10 p-6">
          <XCircle className="text-error mb-2 animate-bounce" size={48} />
          <h3 className="text-xl font-bold text-white uppercase italic">Interferencia de Sensor</h3>
          <p className="text-error/80 text-[10px] font-mono leading-tight">{cameraError}</p>
          <Boton onClick={startScanner} variant="outline" className="mt-4 border-error/20 text-error hover:bg-error/10">
             Reiniciar Protocolo
          </Boton>
        </div>
      )}

      {isScanning && (
        <Boton onClick={stopScanner} variant="outline" className="w-full h-12 rounded-xl text-text-muted border-white/5 uppercase font-bold tracking-widest text-[10px]">
           Desactivar Sensores
        </Boton>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 20%; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 80%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          position: absolute;
        }
        #reader-container video { border-radius: 24px; object-fit: cover !important; width: 100% !important; height: 100% !important; }
        #reader-container__dashboard_section_csr_button { display: none !important; }
      `}</style>
    </div>
  );
};
