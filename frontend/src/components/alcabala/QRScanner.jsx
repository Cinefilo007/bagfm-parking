import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { Camera, XCircle, RotateCcw } from 'lucide-react';
import { Boton } from '../ui/Boton';

/**
 * Componente QRScanner Premium.
 * Maneja el ciclo de vida de la cámara y el escaneo.
 */
export const QRScanner = ({ onScanSuccess, onScanError, autoStart = false }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const qrRef = useRef(null);
  const html5QrCode = useRef(null);

  const startScanner = async () => {
    try {
      setCameraError(null);
      setIsScanning(true);
      
      const qrCodeId = "reader";
      html5QrCode.current = new Html5Qrcode(qrCodeId);
      
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.current.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Éxito
          html5QrCode.current.stop();
          setIsScanning(false);
          onScanSuccess(decodedText);
        },
        (errorMessage) => {
          // No logueamos errores continuos de escaneo por performance
          if (onScanError) onScanError(errorMessage);
        }
      );
    } catch (err) {
      console.error("No se pudo iniciar la cámara", err);
      setCameraError("No se pudo acceder a la cámara. Asegúrate de dar permisos.");
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (autoStart) {
      const timer = setTimeout(() => startScanner(), 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart]);

  useEffect(() => {
    // Limpieza al desmontar
    return () => {
      if (html5QrCode.current && html5QrCode.current.isScanning) {
        html5QrCode.current.stop();
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
      {/* Container del Lector */}
      <div 
        id="reader" 
        className={`relative overflow-hidden rounded-3xl border-2 border-white/10 bg-bg-low shadow-xl w-full aspect-square flex items-center justify-center ${!isScanning && 'hidden'}`}
      >
        {/* Marcador Táctico (Overlay) */}
        {isScanning && (
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-primary/50 rounded-2xl relative">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg scale-110"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg scale-110"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg scale-110"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg scale-110"></div>
                {/* Línea de escaneo animada */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/70 shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)] animate-pulse-fast transition-all" 
                     style={{animation: 'scan 2s linear infinite'}}></div>
            </div>
          </div>
        )}
      </div>

      {!isScanning && !cameraError && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-2">
            <Camera className="text-white/40" size={32} />
          </div>
          <h3 className="text-xl font-bold text-white">Listo para Escanear</h3>
          <p className="text-text-muted text-sm px-8">Apunta la cámara al código QR del socio para verificar su acceso.</p>
          <Boton onClick={startScanner} variant="primary" className="mt-4 px-10 h-14 rounded-2xl text-lg flex items-center gap-3">
             <Camera size={20} /> Iniciar Cámara
          </Boton>
        </div>
      )}

      {cameraError && (
        <div className="flex flex-col items-center gap-4 text-center">
          <XCircle className="text-error mb-2" size={48} />
          <h3 className="text-xl font-bold text-white">Oops! Error</h3>
          <p className="text-error/80 text-sm">{cameraError}</p>
          <Boton onClick={startScanner} variant="outline" className="mt-4 flex items-center gap-2">
             <RotateCcw size={18} /> Reintentar
          </Boton>
        </div>
      )}

      {isScanning && (
        <Boton onClick={stopScanner} variant="outline" className="w-full h-12 rounded-xl text-text-muted border-white/5">
           Cancelar Escaneo
        </Boton>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        #reader__dashboard_section_csr_button { display: none !important; }
        #reader__status_span { display: none !important; }
        video { border-radius: 20px; object-fit: cover !important; }
      `}</style>
    </div>
  );
};
