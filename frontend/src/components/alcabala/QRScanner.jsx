import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, XCircle, RotateCcw, SwitchCamera } from 'lucide-react';
import { Boton } from '../ui/Boton';
import { cn } from '../../lib/utils';

export const QRScanner = ({ onScanSuccess, onScanError, autoStart = false, status = 'idle' }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [successFlash, setSuccessFlash] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  
  const html5QrCode = useRef(null);
  const lastTokenRef = useRef(null);
  const lastScanTimeRef = useRef(0);

  const loadCameras = async () => {
      try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
              setCameras(devices);
              // Intentar buscar una cámara trasera que no sea 'ultra wide'
              const backCameras = devices.filter(d => 
                d.label.toLowerCase().includes('back') || 
                d.label.toLowerCase().includes('rear') ||
                d.label.toLowerCase().includes('0')
              );
              if (backCameras.length > 0) {
                  // En Samsung, solemos querer la cámara con el índice más alto o que no sea '0' (que suele ser ultra wide)
                  const targetIdx = devices.indexOf(backCameras[backCameras.length - 1]);
                  setCurrentCameraIndex(targetIdx > -1 ? targetIdx : 0);
              }
          }
      } catch (e) {
          console.error("Error cargando cámaras:", e);
      }
  };

  useEffect(() => {
      loadCameras();
  }, []);

  const startScanner = async (forcedIndex = null) => {
    if (html5QrCode.current && html5QrCode.current.isScanning) {
        await stopScanner();
    }
    
    try {
      setCameraError(null);
      setIsScanning(true);
      
      const qrCodeId = "reader-container";
      html5QrCode.current = new Html5Qrcode(qrCodeId);
      
      const config = {
        fps: 20,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
            const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.8);
            return { width: size, height: size };
        },
        aspectRatio: 1.0,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true }
      };

      const cameraId = forcedIndex !== null && cameras[forcedIndex] 
        ? cameras[forcedIndex].id 
        : { facingMode: "environment" };

      await html5QrCode.current.start(
        cameraId,
        config,
        (decodedText) => {
          // Lógica de Enfriamiento (Cooldown) para evitar spam del mismo token
          const now = Date.now();
          if (decodedText === lastTokenRef.current && (now - lastScanTimeRef.current) < 3000) {
              return; // Ignorar si es el mismo en menos de 3 seg
          }

          lastTokenRef.current = decodedText;
          lastScanTimeRef.current = now;

          // Feedback visual
          setSuccessFlash(true);
          if (navigator.vibrate) navigator.vibrate(100);
          
          // Notificar al padre pero NO detener la cámara
          onScanSuccess(decodedText);

          setTimeout(() => setSuccessFlash(false), 500);
        },
        () => {} 
      );
    } catch (err) {
      console.error("FALLO CÁMARA:", err);
      setCameraError(`Fallo de sensor: ${err.message || 'Sin acceso'}`);
      setIsScanning(false);
    }
  };

  const switchCamera = () => {
      if (cameras.length < 2) return;
      const nextIdx = (currentCameraIndex + 1) % cameras.length;
      setCurrentCameraIndex(nextIdx);
      startScanner(nextIdx);
  };

  useEffect(() => {
    if (autoStart && cameras.length > 0) {
      const timer = setTimeout(() => startScanner(currentCameraIndex), 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, cameras.length]);

  useEffect(() => {
    return () => {
      if (html5QrCode.current && html5QrCode.current.isScanning) {
        html5QrCode.current.stop().catch(() => {});
      }
    };
  }, []);

  const stopScanner = async () => {
    if (html5QrCode.current && html5QrCode.current.isScanning) {
      try {
          await html5QrCode.current.stop();
          await html5QrCode.current.clear();
      } catch (e) {}
      setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto relative h-full">
      {/* Container del Lector */}
      <div 
        className={cn(
            "relative overflow-hidden rounded-[2rem] border-2 shadow-2xl w-full aspect-square flex items-center justify-center transition-all duration-700 bg-black/40",
            status === 'idle' && "border-white/10",
            status === 'success' && "border-primary shadow-[0_0_40px_rgba(var(--primary-rgb),0.2)]",
            status === 'error' && "border-error shadow-[0_0_40px_rgba(239,68,68,0.2)]"
        )}
      >
        <div id="reader-container" className="w-full h-full" />

        {/* Not Found / Overlay */}
        {!isScanning && (
             <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
                 <Camera className="text-white/10" size={64} />
                 <h4 className="text-lg font-black text-white/40 uppercase italic tracking-tighter">Sensor Inactivo</h4>
                 <p className="text-[10px] text-white/20 font-black uppercase tracking-widest leading-relaxed">
                     Aegis requiere activación manual<br/>del sensor óptico para procesar
                 </p>
             </div>
        )}

        {/* Flash de Éxito al detectar */}
        {successFlash && (
          <div className="absolute inset-0 z-50 bg-primary/40 animate-in fade-in duration-100" />
        )}

        {/* Marcador Táctico Original */}
        {isScanning && (
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
            <div className="w-[75%] h-[75%] border-2 border-white/5 rounded-3xl relative border-dashed">
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl"></div>
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/50 animate-scan" />
            </div>
          </div>
        )}
      </div>

      {/* Acciones de Cámara */}
      <div className="absolute -bottom-4 left-0 right-0 flex justify-center gap-4 px-6 z-20">
         {!isScanning ? (
             <Boton onClick={() => startScanner(currentCameraIndex)} variant="primario" className="w-full h-14 rounded-2xl font-black uppercase italic shadow-2xl scale-105">
                 Activar Radar
             </Boton>
         ) : (
             <div className="flex gap-2 w-full">
                 <Boton onClick={switchCamera} variant="outline" className="flex-1 h-12 rounded-xl border-white/10 bg-black/60 backdrop-blur-md font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                     <SwitchCamera size={16} /> Cambiar Lente
                 </Boton>
                 <Boton onClick={stopScanner} variant="outline" className="flex-1 h-12 rounded-xl border-white/10 bg-black/60 backdrop-blur-md font-black uppercase text-[10px] tracking-widest">
                     Pausar
                 </Boton>
             </div>
         )}
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 2.5s ease-in-out infinite;
          position: absolute;
        }
        #reader-container video { border-radius: 2rem; object-fit: cover !important; }
      `}</style>
    </div>
  );
};
