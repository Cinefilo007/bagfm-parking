import React, { useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { Boton } from '../components/ui/Boton';
import { Input } from '../components/ui/Input';
import { 
  ShieldCheck, 
  Info,
  Fingerprint
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import { ThemeToggle } from '../components/ui/ThemeToggle';

export default function Login() {
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [errorLocal, setErrorLocal] = useState('');
  const { login, isLoading: isAuthLoading } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loginBiometrico = useAuthStore(state => state.loginBiometrico);

  const handleLoginBiometrico = async () => {
    if (!cedula) {
      setErrorLocal('Ingresa tu cédula para iniciar acceso biométrico');
      toast.error('Se requiere la cédula para identificar el dispositivo');
      return;
    }

    setLoading(true);
    try {
      await loginBiometrico(cedula.trim());
      navigate('/');
      toast.success('Acceso biométrico concedido');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error en autenticación biométrica.';
      setErrorLocal(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorLocal('');
    
    if (!cedula || !password) {
      setErrorLocal('Todos los campos son obligatorios');
      return;
    }

    setLoading(true);
    const cedulaLimpia = cedula.trim();
    const passwordLimpia = password.trim();

    try {
      await login(cedulaLimpia, passwordLimpia);
      // Redirigir basado en el rol (lo lee del store hidratado)
      // Como RutaProtegida se encarga de esto si vas a "/", lo enviamos al base
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error de credenciales o red.';
      setErrorLocal(msg);
      toast.error(msg, { duration: 20000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-app flex flex-col justify-center px-6 antialiased">
      <ThemeToggle />
      
      <div className="w-full max-w-sm mx-auto">
        {/* LOGO SIMULADO */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex flex-col items-center justify-center mb-4 shadow-[0_0_30px_rgba(78,222,163,0.3)]">
            <ShieldCheck size={32} color="#003824" strokeWidth={2} />
          </div>
          <h1 className="font-display font-bold text-3xl tracking-tight text-text-main uppercase">BAGFM</h1>
          <p className="text-primary tracking-[0.2em] text-[10px] font-semibold uppercase mt-1">Control Táctico</p>
        </div>

        {/* CARTA DE LOGIN */}
        <div className="bg-bg-modal rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          {/* Acento decorativo */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
          
          <h2 className="font-display font-semibold text-text-main text-lg mb-6 text-center underline decoration-primary/20 decoration-2 underline-offset-8">Acceso de Seguridad</h2>
          
          <form onSubmit={handleLogin} className="mt-8">
            <Input 
              label="Cédula de Identidad" 
              placeholder="V-12345678"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              disabled={loading}
              error={errorLocal && !cedula ? 'Requerido' : null}
            />
            
            <Input 
              label="Contraseña" 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              error={errorLocal && cedula ? errorLocal : null} // Muestra el request error
            />
            
            <Boton 
              type="submit" 
              className="mt-4 w-full"
              isLoading={loading}
            >
              Iniciar Sesión
            </Boton>

            <Boton 
              type="button"
              variante="secundario"
              className="mt-3 w-full group"
              onClick={handleLoginBiometrico}
              disabled={loading}
            >
              <Fingerprint className="mr-2 group-hover:text-primary transition-colors" size={18} />
              Acceso Biométrico
            </Boton>
            
            {errorLocal && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-fade-in">
                <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center leading-tight">
                  {errorLocal}
                </p>
              </div>
            )}
          </form>
        </div>
        
        <p className="text-center text-text-muted mt-8 text-xs font-medium uppercase tracking-widest">
          Sistema de Acceso Restringido
        </p>
      </div>
    </div>
  );
}
