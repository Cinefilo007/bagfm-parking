import React, { useState, useEffect } from 'react';
import { Shield, Plus, UserPlus, Trash2, Clock, MapPin, Key, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Boton } from '../../components/ui/Boton';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { comandoService } from '../../services/comando.service';
import { toast } from 'react-hot-toast';

export default function Alcabalas() {
  const [puntos, setPuntos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModalPunto, setShowModalPunto] = useState(false);
  const [showModalGuardia, setShowModalGuardia] = useState(false);
  const [credencialTemp, setCredencialTemp] = useState(null);

  const [formPunto, setFormPunto] = useState({ nombre: '', ubicacion: '' });
  const [formGuardia, setFormGuardia] = useState({ cedula: '', nombre: '', apellido: '' });

  useEffect(() => {
    fetchPuntos();
  }, []);

  const fetchPuntos = async () => {
    try {
      const data = await comandoService.getPuntosAcceso();
      setPuntos(data);
    } catch (error) {
      toast.error('Error al cargar alcabalas');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearPunto = async (e) => {
    e.preventDefault();
    try {
      await comandoService.crearPuntoAcceso(formPunto);
      toast.success('Punto de acceso registrado');
      setShowModalPunto(false);
      setFormPunto({ nombre: '', ubicacion: '' });
      fetchPuntos();
    } catch (error) {
      toast.error('No se pudo crear el punto');
    }
  };

  const handleCrearGuardia = async (e) => {
    e.preventDefault();
    try {
      const res = await comandoService.crearGuardiaTemporal(formGuardia);
      setCredencialTemp(res);
      setShowModalGuardia(false);
      setFormGuardia({ cedula: '', nombre: '', apellido: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear guardia');
    }
  };

  const handleLimpiar = async () => {
    if (!confirm('¿Seguro que desea desactivar todos los guardias expirados?')) return;
    try {
      const res = await comandoService.limpiar_guardias();
      toast.success(res.mensaje);
    } catch (error) {
      toast.error('Error en limpieza');
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="text-primary" />
            Gestión de Alcabalas
          </h1>
          <p className="text-text-muted text-sm">Mando y Control de Accesos</p>
        </div>
        <Boton variant="ghost" className="text-error" onClick={handleLimpiar}>
          <Trash2 size={18} />
        </Boton>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PUNTOS DE ACCESO */}
        <Card className="bg-bg-low border-white/5">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin size={20} className="text-primary" />
              Alcabalas Activas
            </CardTitle>
            <Boton size="sm" onClick={() => setShowModalPunto(true)}>
              <Plus size={16} />
            </Boton>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {puntos.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                  <div>
                    <p className="font-bold text-white">{p.nombre}</p>
                    <p className="text-[10px] text-text-muted uppercase">{p.ubicacion || 'Sin ubicación específica'}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                </div>
              ))}
              {puntos.length === 0 && !loading && (
                <p className="text-center text-text-muted py-4 italic text-sm">No hay alcabalas registradas</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* GUARDIA TEMPORAL */}
        <Card className="bg-bg-low border-white/5 h-full">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus size={20} className="text-primary" />
              Guardia de Turno
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
               <Clock size={32} />
            </div>
            <div className="text-center">
              <p className="text-white font-medium">Registro de Usuario Temporal</p>
              <p className="text-xs text-text-muted max-w-[200px] mx-auto">
                Crea una cuenta válida por 24 horas para el personal de guardia.
              </p>
            </div>
            <Boton onClick={() => setShowModalGuardia(true)} className="w-full">
              Asignar Guardia
            </Boton>
          </CardContent>
        </Card>
      </div>

      {/* MODAL CREAR PUNTO */}
      <Modal isOpen={showModalPunto} onClose={() => setShowModalPunto(false)} title="Nueva Alcabala">
        <form onSubmit={handleCrearPunto} className="space-y-4">
          <Input 
            label="Nombre de Alcabala" 
            placeholder="Ej: Alcabala Principal (Paso Real)"
            value={formPunto.nombre}
            onChange={e => setFormPunto({...formPunto, nombre: e.target.value})}
            required
          />
          <Input 
            label="Ubicación / Referencia" 
            placeholder="Ej: Zona Norte, proximidad Hangares"
            value={formPunto.ubicacion}
            onChange={e => setFormPunto({...formPunto, ubicacion: e.target.value})}
          />
          <Boton type="submit" className="w-full">Registrar Punto</Boton>
        </form>
      </Modal>

      {/* MODAL CREAR GUARDIA */}
      <Modal isOpen={showModalGuardia} onClose={() => setShowModalGuardia(false)} title="Asignar Nuevo Guardia">
        <form onSubmit={handleCrearGuardia} className="space-y-4">
          <Input 
            label="Cédula" 
            placeholder="V-12345678"
            value={formGuardia.cedula}
            onChange={e => setFormGuardia({...formGuardia, cedula: e.target.value})}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <Input 
              label="Nombre" 
              value={formGuardia.nombre}
              onChange={e => setFormGuardia({...formGuardia, nombre: e.target.value})}
              required
            />
            <Input 
              label="Apellido" 
              value={formGuardia.apellido}
              onChange={e => setFormGuardia({...formGuardia, apellido: e.target.value})}
              required
            />
          </div>
          <Boton type="submit" className="w-full">Generar Credenciales</Boton>
        </form>
      </Modal>

      {/* MODAL CREDENCIAL GENERADA */}
      <Modal isOpen={!!credencialTemp} onClose={() => setCredencialTemp(null)} title="Credenciales Temporales">
        {credencialTemp && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center flex-col items-center gap-2">
               <div className="w-12 h-12 bg-success/20 text-success rounded-full flex items-center justify-center">
                  <CheckCircle2 size={24} />
               </div>
               <h3 className="text-white font-bold text-lg uppercase tracking-tight">Acceso Generado</h3>
            </div>
            
            <div className="bg-black/60 p-6 rounded-2xl border border-white/5 space-y-4">
               <div>
                  <p className="text-text-muted text-[10px] uppercase font-bold tracking-widest mb-1">Usuario (Cédula)</p>
                  <p className="text-2xl font-mono text-white tracking-wider">{credencialTemp.cedula}</p>
               </div>
               <div className="py-2 border-t border-white/5">
                  <p className="text-text-muted text-[10px] uppercase font-bold tracking-widest mb-1">Contraseña Temporal</p>
                  <p className="text-2xl font-mono text-primary font-bold">{credencialTemp.password_temporal}</p>
               </div>
               <div className="pt-2 border-t border-white/5 flex items-center justify-center gap-2 text-warning">
                  <Clock size={14} />
                  <p className="text-xs font-medium">Expira: {new Date(credencialTemp.expira_at).toLocaleString()}</p>
               </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
               <p className="text-xs text-primary/80 italic">
                  Entregue estas credenciales al guardia. El sistema le pedirá cambiar la contraseña si es su primer acceso (opcional) o la cuenta se autodestruirá al finalizar el turno.
               </p>
            </div>

            <Boton variant="ghost" onClick={() => setCredencialTemp(null)} className="w-full text-text-muted">
              Cerrar
            </Boton>
          </div>
        )}
      </Modal>
    </div>
  );
}
