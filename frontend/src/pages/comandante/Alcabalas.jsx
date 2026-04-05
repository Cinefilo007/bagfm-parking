import React, { useState, useEffect } from 'react';
import { 
  Shield, Plus, Trash2, MapPin, Key, 
  RefreshCw, Phone, Copy, Edit3, 
  ExternalLink, UserCheck, Clock, 
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Boton } from '../../components/ui/Boton';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { comandoService } from '../../services/comando.service';
import { toast } from 'react-hot-toast';

export default function Alcabalas() {
  const [puntos, setPuntos] = useState([]);
  const [personales, setPersonales] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [showModalPunto, setShowModalPunto] = useState(false);
  const [puntoSeleccionado, setPuntoSeleccionado] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);

  const [formPunto, setFormPunto] = useState({ nombre: '', ubicacion: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resPuntos, resPersonal] = await Promise.all([
        comandoService.getPuntosAcceso(),
        comandoService.getPersonalActivo()
      ]);
      setPuntos(resPuntos);
      setPersonales(resPersonal);
    } catch (error) {
      toast.error('Error al sincronizar datos tácticos');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearOEditarPunto = async (e) => {
    e.preventDefault();
    try {
      if (puntoSeleccionado) {
        await comandoService.actualizarPuntoAcceso(puntoSeleccionado.id, formPunto);
        toast.success('Alcabala actualizada');
      } else {
        await comandoService.crearPuntoAcceso(formPunto);
        toast.success('Punto de control desplegado');
      }
      setShowModalPunto(false);
      setPuntoSeleccionado(null);
      setFormPunto({ nombre: '', ubicacion: '' });
      fetchData();
    } catch (error) {
      toast.error('No se pudo procesar la solicitud');
    }
  };

  const handleEliminarPunto = async (id) => {
    try {
      await comandoService.eliminarPuntoAcceso(id);
      toast.success('Alcabala desarticulada del sistema');
      setShowConfirmDelete(null);
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar punto');
    }
  };

  const handleRegenerarClave = async (id) => {
    try {
      const res = await comandoService.regenerarClave(id);
      toast.success(`Nueva clave generada: ${res.nueva_clave}`, { duration: 5000 });
      fetchData();
    } catch (error) {
      toast.error('Error al regenerar clave');
    }
  };

  const copiarAlPortapapeles = (texto, mensaje) => {
    navigator.clipboard.writeText(texto);
    toast.success(mensaje || 'Copiado al portapapeles');
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <header className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 truncate">
            <Shield className="text-primary shrink-0" />
            <span className="truncate">Mando de Alcabalas</span>
          </h1>
          <p className="text-text-muted text-sm truncate">Control Directo y Relevo Táctico</p>
        </div>
        <Boton 
          size="sm" 
          onClick={() => {
            setPuntoSeleccionado(null);
            setFormPunto({ nombre: '', ubicacion: '' });
            setShowModalPunto(true);
          }}
          className="gap-2 h-9 px-6 w-fit shrink-0 whitespace-nowrap shadow-tactica"
        >
          <Plus size={16} />
          <span>Crear Alcabala</span>
        </Boton>
      </header>

      {/* GRID DE ALCABALAS Y CLAVES */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {puntos.map(p => (
          <Card key={p.id} className="bg-bg-low border-white/5 overflow-hidden group">
            <div className={`h-1 w-full ${p.activo ? 'bg-primary' : 'bg-error'} opacity-50`} />
            <CardContent className="p-0">
              <div className="p-4 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black text-white leading-tight uppercase tracking-widest truncate" title={p.nombre}>{p.nombre}</h3>
                  <p className="text-[9px] text-text-muted flex items-center gap-1 mt-0.5 truncate font-bold">
                    <MapPin size={9} className="text-primary shrink-0" />
                    <span className="truncate">{p.ubicacion || 'Sector Norte'}</span>
                  </p>
                </div>
                
                {/* GRUPO DE ACCIONES TÁCTICAS */}
                <div className="flex items-center gap-1.5 shrink-0 ml-4">
                    <Boton 
                        variant="secundario" 
                        size="sm" 
                        className="h-8 w-8 px-0 border-white/10"
                        onClick={() => {
                            setPuntoSeleccionado(p);
                            setFormPunto({ nombre: p.nombre, ubicacion: p.ubicacion });
                            setShowModalPunto(true);
                        }}
                    >
                        <Edit3 size={14} />
                    </Boton>
                    <Boton 
                        variant="destructivo" 
                        size="sm" 
                        className="h-8 w-8 px-0"
                        onClick={() => setShowConfirmDelete(p)}
                    >
                        <Trash2 size={14} />
                    </Boton>
                </div>
              </div>

              {/* CUERPO DE SEGURIDAD */}
              <div className="p-4 space-y-4">
                {/* Usuario asignado */}
                <div className="bg-black/20 rounded-xl p-3 border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-[7px] font-black text-text-muted uppercase tracking-[0.2em] mb-0.5">Identificador de Acceso</p>
                    <p className="text-xs font-mono font-bold text-white/90 selection:bg-primary/30">{p.usuario_nombre}</p>
                  </div>
                  <Boton 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 px-0 hover:bg-white/10"
                    onClick={() => copiarAlPortapapeles(p.usuario_nombre, 'Usuario copiado')}
                    title="Copiar Usuario"
                  >
                    <Copy size={14} />
                  </Boton>
                </div>

                {/* Clave rotativa */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-[7px] font-black text-primary uppercase tracking-[0.2em] mb-1">Clave Táctica (24H)</p>
                    <div className="flex items-center gap-3">
                        <p className="text-3xl font-mono font-black text-white tracking-[0.15em]">{p.clave_hoy}</p>
                        <Boton 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 px-0 text-text-muted hover:text-white"
                            onClick={() => copiarAlPortapapeles(p.clave_hoy, 'Clave copiada')}
                        >
                            <Copy size={14} />
                        </Boton>
                    </div>
                  </div>
                  
                  <Boton 
                    variant="secundario" 
                    size="sm"
                    className="h-12 w-12 px-0 bg-primary/5 border-primary/20 hover:bg-primary hover:text-on-primary transition-all rounded-xl"
                    title="Renovar Clave Táctica"
                    onClick={() => handleRegenerarClave(p.id)}
                  >
                    <RefreshCw size={22} className="animate-spin-slow" />
                  </Boton>
                </div>
                {/* Indicador de tiempo */}
                <div className="mt-3 flex items-center gap-2 text-[10px] text-text-muted">
                    <Clock size={12} />
                    <span>Próximo relevo: 08:30 AM Caracas</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {puntos.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-3xl">
            <Shield size={48} className="mx-auto text-white/10 mb-4" />
            <p className="text-text-muted italic">No hay puntos de control activos desplegados</p>
          </div>
        )}
      </section>

      {/* MONITOR DE PERSONAL EN VIVO */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck size={22} className="text-success" />
                Personal en Operación
            </h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-success/10 text-success rounded-full border border-success/20">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">En Línea</span>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personales.map(g => (
                <Card key={g.alcabala_id} className="bg-bg-low border-white/10 overflow-hidden hover:border-success/30 transition-all">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center text-success border border-success/20">
                                <Shield size={24} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-success uppercase bg-success/10 px-1.5 py-0.5 rounded border border-success/20">
                                        {g.grado || 'S/G'}
                                    </span>
                                    <h4 className="font-bold text-white">{g.nombre}</h4>
                                </div>
                                <p className="text-[10px] text-text-muted font-medium mt-0.5 uppercase tracking-wide">
                                    {g.alcabala} • {g.unidad || 'Unidad No Registrada'}
                                </p>
                            </div>
                        </div>

                        {/* ACCIONES DE CONTACTO */}
                        <div className="flex items-center gap-2">
                            {g.telefono && (
                                <a 
                                    href={`tel:${g.telefono}`} 
                                    className="h-10 w-10 flex items-center justify-center bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all rounded-xl border border-primary/20"
                                    title="Llamar directamente"
                                >
                                    <Phone size={20} />
                                </a>
                            )}
                            <Boton 
                                variant="ghost" 
                                size="icon" 
                                className="h-10 w-10 bg-white/5 text-text-muted hover:text-white rounded-xl"
                                onClick={() => copiarAlPortapapeles(g.telefono || '', 'Teléfono copiado')}
                                title="Copiar Teléfono"
                            >
                                <Copy size={18} />
                            </Boton>
                        </div>
                    </CardContent>
                    <div className="px-4 py-2 bg-black/40 border-t border-white/5 flex items-center justify-between text-[9px] text-text-muted italic">
                         <span>Turno iniciado: {new Date(g.inicio).toLocaleString()}</span>
                         <span className="flex items-center gap-1"><ExternalLink size={10} /> Logs de acceso</span>
                    </div>
                </Card>
            ))}
            {personales.length === 0 && (
                <div className="col-span-full p-10 bg-black/20 rounded-3xl border border-white/5 text-center">
                    <p className="text-text-muted italic text-sm">No hay reportes de guardias activos en los puntos de control</p>
                </div>
            )}
        </div>
      </section>

      {/* MODAL CREAR / EDITAR PUNTO */}
      <Modal 
        isOpen={showModalPunto} 
        onClose={() => setShowModalPunto(false)} 
        title={puntoSeleccionado ? "Modificar Alcabala" : "Nuevo Despliegue"}
      >
        <form onSubmit={handleCrearOEditarPunto} className="space-y-4">
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
          <div className="pt-4 flex gap-2">
            <Boton variant="ghost" type="button" onClick={() => setShowModalPunto(false)} className="flex-1">Cancelar</Boton>
            <Boton type="submit" className="flex-1">{puntoSeleccionado ? 'Actualizar' : 'Desplegar'}</Boton>
          </div>
        </form>
      </Modal>

      {/* MODAL CONFIRMAR ELIMINAR */}
      <Modal 
        isOpen={!!showConfirmDelete} 
        onClose={() => setShowConfirmDelete(null)} 
        title="Desarticular Punto"
      >
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <p className="text-white font-medium">¿Está seguro de eliminar la alcabala "{showConfirmDelete?.nombre}"?</p>
          <p className="text-xs text-text-muted">
            Esta acción eliminará el punto de control y su usuario asociado permanentemente. 
            No podrá recuperar la trazabilidad directa de este punto.
          </p>
          <div className="flex gap-3 pt-4">
            <Boton variant="ghost" onClick={() => setShowConfirmDelete(null)} className="flex-1">Mantener</Boton>
            <Boton variant="error" onClick={() => handleEliminarPunto(showConfirmDelete?.id)} className="flex-1">Eliminar Definitivamente</Boton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
