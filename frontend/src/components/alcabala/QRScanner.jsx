import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, XCircle, RotateCcw } from 'lucide-react';
import { Boton } from '../ui/Boton';

export const QRScanner = ({ onScanSuccess, onScanError, autoStart = false }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [successFlash, setSuccessFlash] = useState(false);
  const html5QrCode = useRef(null);

  const startScanner = async () => {
    if (html5QrCode.current && html5QrCode.current.isScanning) {
        console.log("Escáner ya activo, rebotando inicio...");
        return;
    }
    
    try {
      setCameraError(null);
      setIsScanning(true);
      
      const qrCodeId = "reader";
      
      // Asegurar limpieza de instancia previa
      if (html5QrCode.current) {
          try { await html5QrCode.current.clear(); } catch(e) {}
      }

      html5QrCode.current = new Html5Qrcode(qrCodeId, {
          formatsToSupport: [ 
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.AZTEC,
              Html5QrcodeSupportedFormats.DATA_MATRIX,
              Html5QrcodeSupportedFormats.PDF_417
          ],
          verbose: false
      });
      
      const config = {
        fps: 20, // Mayor frecuencia para detección rápida
        qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.floor(minEdge * 0.7);
            return { width: size, height: size };
        },
        aspectRatio: 1.0,
        experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
        }
      };

      console.log("Iniciando cámara con configuración táctica...");

      await html5QrCode.current.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          console.log(">>> [DETECTOR] CÓDIGO CAPTURADO:", decodedText);
          
          setSuccessFlash(true);
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          
          try {
            await html5QrCode.current.stop();
            await html5QrCode.current.clear();
          } catch (e) {
            console.warn("Fallo en parada de sensor:", e);
          }
          
          setIsScanning(false);
          setTimeout(() => {
            setSuccessFlash(false);
            onScanSuccess(decodedText);
          }, 400);
        },
        (errorMessage) => {
          // No logueamos errores de 'no se encontró QR en este frame'
        }
      );
    } catch (err) {
      console.error("ERROR CRÍTICO DE CÁMARA:", err);
      setCameraError(`Fallo de sensor: ${err.name || "Error desconocido"}. Verifique permisos y conexión HTTPS.`);
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (autoStart) {
      const timer = setTimeout(() => {
        startScanner();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [autoStart]);

  useEffect(() => {
    return () => {
      if (html5QrCode.current && html5QrCode.current.isScanning) {
        html5QrCode.current.stop().catch(console.error);
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
      <div 
        id="reader" 
        className={`relative overflow-hidden rounded-3xl border-2 border-white/10 bg-bg-low shadow-xl w-full aspect-square flex items-center justify-center ${!isScanning && 'hidden'}`}
      >
        {/* Flash de Éxito */}
        {successFlash && (
          <div className="absolute inset-0 z-50 bg-primary/40 animate-pulse duration-100" />
        )}

        {/* Marcador Táctico */}
        {isScanning && (
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-primary/30 rounded-2xl relative">
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
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-2 animate-pulse-slow">
            <Camera className="text-white/40" size={32} />
          </div>
          <h3 className="text-xl font-black text-white uppercase italic tracking-wider">Listo para Operar</h3>
          <p className="text-text-muted text-xs px-8 font-bold uppercase tracking-widest opacity-60">
            Escanee el código QR del socio para verificación táctica.
          </p>
          <Boton onClick={startScanner} variant="primario" className="mt-4 px-10 h-14 rounded-2xl text-lg flex items-center gap-3">
             <Camera size={20} /> Iniciar Escaneo
          </Boton>
        </div>
      )}

      {cameraError && (
        <div className="flex flex-col items-center gap-4 text-center">
          <XCircle className="text-error mb-2" size={48} />
          <h3 className="text-xl font-bold text-white uppercase italic">Fallo de Sensor</h3>
          <p className="text-error/80 text-xs font-mono">{cameraError}</p>
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
        .animate-scan {
          animation: scan 2s linear infinite;
          position: absolute;
        }
        #reader__dashboard_section_csr_button { display: none !important; }
        #reader__status_span { display: none !important; }
        video { border-radius: 20px; object-fit: cover !important; }
      `}</style>
    </div>
  );
};
