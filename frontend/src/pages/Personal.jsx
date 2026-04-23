import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Boton } from '../components/ui/Boton';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import {
  UserCircle, Plus, UserCog, Hash, Phone, Building2, Power, RotateCcw,
  UserMinus, BadgeCheck, Search, ChevronLeft, ChevronRight, MapPin,
  ChevronDown, ChevronUp, Star, AlertTriangle, Edit2, X, Check,
  TrendingUp, Shield, Award, Clock, Zap, AlertCircle
} from 'lucide-react';
import personalService from '../services/personal.service';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const TIPOS_INCENTIVO = [
  { valor: 'bono_eficiencia', etiqueta: 'Bono de Eficiencia', icono: Zap },
  { valor: 'reconocimiento', etiqueta: 'Reconocimiento', icono: Award },
  { valor: 'dia_libre', etiqueta: 'Día Libre', icono: Star },
  { valor: 'ascenso', etiqueta: 'Ascenso', icono: TrendingUp },
];

const TIPOS_SANCION = [
  { valor: 'amonestacion', etiqueta: 'Amonestación Verbal', color: 'text-amber-400' },
  { valor: 'suspension_temporal', etiqueta: 'Suspensión Temporal', color: 'text-orange-400' },
  { valor: 'relevo_inmediato', etiqueta: 'Relevo Inmediato', color: 'text-danger' },
  { valor: 'reportar_autoridades', etiqueta: 'Reportar a Autoridades', color: 'text-red-400' },
];

const ETIQUETA_INCENTIVO = {
  bono_eficiencia: { label: 'BONO EFIC.', color: 'text-primary bg-primary/10 border-primary/20' },
  reconocimiento:  { label: 'RECONOC.',  color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  dia_libre:       { label: 'DÍA LIBRE', color: 'text-sky-400 bg-sky-400/10 border-sky-400/20' },
  ascenso:         { label: 'ASCENSO',   color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
};

const ETIQUETA_SANCION = {
  amonestacion:         { label: 'AMONEST.',   color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  suspension_temporal:  { label: 'SUSPENSIÓN', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  relevo_inmediato:     { label: 'RELEVO',     color: 'text-danger bg-danger/10 border-danger/20' },
  reportar_autoridades: { label: 'AUTORIDADES',color: 'text-red-600 bg-red-600/10 border-red-600/20' },
};

const ESTADO_SANCION = {
  activa:  { label: 'ACTIVA',   color: 'text-danger' },
  cumplida:{ label: 'CUMPLIDA', color: 'text-primary' },
  apelada: { label: 'APELADA',  color: 'text-amber-400' },
};

// ─── HELPER: ESTILOS POR ROL ──────────────────────────────────────────────────

const getRolStyles = (rol) => {
  switch (rol) {
    case 'ADMIN_BASE':         return { badge: 'text-primary bg-primary/10 border-primary/20',       avatar: 'text-primary bg-primary/10 border-primary/20',       bar: 'bg-primary' };
    case 'SUPERVISOR':         return { badge: 'text-amber-400 bg-amber-400/10 border-amber-400/20', avatar: 'text-amber-400 bg-amber-400/10 border-amber-400/20', bar: 'bg-amber-400' };
    case 'PARQUERO':           return { badge: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', avatar: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', bar: 'bg-emerald-400' };
    case 'ALCABALA':           return { badge: 'text-sky-400 bg-sky-400/10 border-sky-400/20',       avatar: 'text-sky-400 bg-sky-400/10 border-sky-400/20',       bar: 'bg-sky-400' };
    case 'ADMIN_ENTIDAD':      return { badge: 'text-purple-400 bg-purple-400/10 border-purple-400/20', avatar: 'text-purple-400 bg-purple-400/10 border-purple-400/20', bar: 'bg-purple-400' };
    case 'SUPERVISOR_PARQUEROS': return { badge: 'text-amber-500 bg-amber-500/10 border-amber-500/20', avatar: 'text-amber-500 bg-amber-500/10 border-amber-500/20', bar: 'bg-amber-500' };
    default:                   return { badge: 'text-text-muted bg-white/5 border-white/5',           avatar: 'text-text-muted bg-white/5 border-white/5',           bar: 'bg-text-muted' };
  }
};

// ─── SUBCOMPONENTE: PANEL DE DETALLE ─────────────────────────────────────────

function PanelDetalle({ miembro, onClose, userActual, zonas, onUpdate }) {
  const [tab, setTab] = useState('kpis');
  const [kpis, setKpis] = useState(null);
  const [incentivos, setIncentivos] = useState([]);
  const [sanciones, setSanciones] = useState([]);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // Zona
  const [zonaSeleccionada, setZonaSeleccionada] = useState(miembro.zona_asignada_id || '');
  const [guardandoZona, setGuardandoZona] = useState(false);

  // Nuevo incentivo
  const [nuevoInc, setNuevoInc] = useState({ tipo: '', descripcion: '' });
  const [guardandoInc, setGuardandoInc] = useState(false);

  // Nueva sanción
  const [nuevaSanc, setNuevaSanc] = useState({ tipo: '', motivo: '', ejecutar_inmediato: false });
  const [guardandoSanc, setGuardandoSanc] = useState(false);

  // Edit datos
  const [editDatos, setEditDatos] = useState({
    nombre: miembro.nombre, apellido: miembro.apellido,
    email: miembro.email || '', telefono: miembro.telefono || ''
  });
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  const puedeGestionarZona = ['PARQUERO', 'SUPERVISOR_PARQUEROS'].includes(miembro.rol);

  const cargarKpis = useCallback(async () => {
    try {
      setLoadingKpis(true);
      const data = await personalService.obtenerKpis(miembro.id);
      setKpis(data);
    } catch { setKpis(null); }
    finally { setLoadingKpis(false); }
  }, [miembro.id]);

  const cargarIncentivos = useCallback(async () => {
    try {
      const data = await personalService.listarIncentivos(miembro.id);
      setIncentivos(data);
    } catch { setIncentivos([]); }
  }, [miembro.id]);

  const cargarSanciones = useCallback(async () => {
    try {
      const data = await personalService.listarSanciones(miembro.id);
      setSanciones(data);
    } catch { setSanciones([]); }
  }, [miembro.id]);

  useEffect(() => {
    cargarKpis();
    cargarIncentivos();
    cargarSanciones();
  }, [cargarKpis, cargarIncentivos, cargarSanciones]);

  const handleGuardarZona = async () => {
    setGuardandoZona(true);
    try {
      const updated = await personalService.asignarZona(miembro.id, zonaSeleccionada || null);
      onUpdate(updated);
      toast.success('Zona asignada correctamente');
      await cargarKpis();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al asignar zona');
    } finally { setGuardandoZona(false); }
  };

  const handleAgregarIncentivo = async (e) => {
    e.preventDefault();
    if (!nuevoInc.tipo || !nuevoInc.descripcion) return;
    setGuardandoInc(true);
    try {
      await personalService.agregarIncentivo(miembro.id, nuevoInc);
      setNuevoInc({ tipo: '', descripcion: '' });
      await cargarIncentivos();
      await cargarKpis();
      toast.success('Incentivo registrado');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al registrar incentivo');
    } finally { setGuardandoInc(false); }
  };

  const handleEliminarIncentivo = async (id) => {
    try {
      await personalService.eliminarIncentivo(id);
      await cargarIncentivos();
      await cargarKpis();
      toast.success('Incentivo eliminado');
    } catch { toast.error('Error al eliminar'); }
  };

  const handleAgregarSancion = async (e) => {
    e.preventDefault();
    if (!nuevaSanc.tipo || !nuevaSanc.motivo) return;
    setGuardandoSanc(true);
    try {
      await personalService.agregarSancion(miembro.id, nuevaSanc);
      setNuevaSanc({ tipo: '', motivo: '', ejecutar_inmediato: false });
      await cargarSanciones();
      await cargarKpis();
      toast.success('Sanción aplicada');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al aplicar sanción');
    } finally { setGuardandoSanc(false); }
  };

  const handleActualizarSancion = async (sancionId, estado) => {
    try {
      await personalService.actualizarSancion(sancionId, { estado });
      await cargarSanciones();
      toast.success('Estado de sanción actualizado');
    } catch { toast.error('Error al actualizar sanción'); }
  };

  const handleEliminarSancion = async (id) => {
    try {
      await personalService.eliminarSancion(id);
      await cargarSanciones();
      await cargarKpis();
      toast.success('Sanción eliminada');
    } catch { toast.error('Error al eliminar sanción'); }
  };

  const handleGuardarEdit = async (e) => {
    e.preventDefault();
    setGuardandoEdit(true);
    try {
      const updated = await personalService.actualizar(miembro.id, {
        nombre: editDatos.nombre.toUpperCase(),
        apellido: editDatos.apellido.toUpperCase(),
        email: editDatos.email || null,
        telefono: editDatos.telefono || null,
      });
      onUpdate(updated);
      setEditMode(false);
      toast.success('Datos actualizados');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al actualizar');
    } finally { setGuardandoEdit(false); }
  };

  const estilos = getRolStyles(miembro.activo ? miembro.rol : '__inactivo__');
  const estilosActivos = getRolStyles(miembro.rol);

  const TABS = [
    { id: 'kpis',       label: 'KPIs',       icono: TrendingUp },
    { id: 'zona',       label: 'Zona',        icono: MapPin,      mostrar: puedeGestionarZona },
    { id: 'incentivos', label: 'Incentivos',  icono: Star },
    { id: 'sanciones',  label: 'Sanciones',   icono: Shield },
    { id: 'editar',     label: 'Editar',      icono: Edit2 },
  ].filter(t => t.mostrar !== false);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full md:max-w-2xl bg-[#161B2B] rounded-t-2xl md:rounded-2xl border border-white/10 shadow-2xl z-10 flex flex-col max-h-[92vh]">

        {/* Cabecera del panel */}
        <div className="flex items-center gap-3 p-4 border-b border-white/5">
          <div className={cn(
            "h-11 w-11 rounded-xl flex items-center justify-center border shrink-0",
            miembro.activo ? estilosActivos.avatar : 'bg-danger/10 border-danger/20 text-danger'
          )}>
            <UserCircle size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-text-main uppercase tracking-tight truncate">
              {miembro.nombre} {miembro.apellido}
            </h2>
            <div className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest",
              miembro.activo ? estilosActivos.badge : 'text-danger bg-danger/10 border-danger/20'
            )}>
              {miembro.activo ? miembro.rol.replace(/_/g, ' ') : 'INACTIVO'}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-text-muted hover:text-text-main hover:bg-white/5 transition-all shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 bg-black/20 border-b border-white/5 overflow-x-auto scrollbar-none">
          {TABS.map(tab_item => (
            <button
              key={tab_item.id}
              onClick={() => setTab(tab_item.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                tab === tab_item.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-text-muted hover:text-text-main hover:bg-white/5'
              )}
            >
              <tab_item.icono size={12} />
              {tab_item.label}
            </button>
          ))}
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ── TAB: KPIs ────────────────────────────────────────────── */}
          {tab === 'kpis' && (
            <div className="space-y-4">
              {loadingKpis ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />)}
                </div>
              ) : kpis ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Días activo */}
                    <div className="bg-[#1A1F2F] rounded-xl p-4 flex flex-col gap-1">
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">DÍAS ACTIVO</span>
                      <span className="text-3xl font-black text-primary font-display">{kpis.dias_activo}</span>
                    </div>
                    {/* Incentivos */}
                    <div className="bg-[#1A1F2F] rounded-xl p-4 flex flex-col gap-1">
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">INCENTIVOS</span>
                      <span className="text-3xl font-black text-amber-400 font-display">{kpis.total_incentivos}</span>
                    </div>
                    {/* Sanciones totales */}
                    <div className="bg-[#1A1F2F] rounded-xl p-4 flex flex-col gap-1">
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">SANCIONES</span>
                      <span className={cn("text-3xl font-black font-display", kpis.total_sanciones > 0 ? 'text-danger' : 'text-text-muted')}>{kpis.total_sanciones}</span>
                    </div>
                    {/* Sanciones activas */}
                    <div className="bg-[#1A1F2F] rounded-xl p-4 flex flex-col gap-1">
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">SANC. ACTIVAS</span>
                      <span className={cn("text-3xl font-black font-display", kpis.sanciones_activas > 0 ? 'text-danger' : 'text-primary')}>{kpis.sanciones_activas}</span>
                    </div>
                  </div>

                  {/* Zona asignada */}
                  <div className="bg-[#1A1F2F] rounded-xl p-4 flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-lg shrink-0">
                      <MapPin size={16} className="text-primary" />
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-widest block">Zona Asignada</span>
                      <span className="text-sm font-black text-text-main">
                        {kpis.zona_nombre || <span className="text-text-muted italic font-normal">Sin zona asignada</span>}
                      </span>
                    </div>
                  </div>

                  {/* Último incentivo / sanción */}
                  {(kpis.ultimo_incentivo || kpis.ultima_sancion) && (
                    <div className="grid grid-cols-2 gap-3">
                      {kpis.ultimo_incentivo && (
                        <div className="bg-amber-400/5 border border-amber-400/10 rounded-xl p-3">
                          <span className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-1">Último Incentivo</span>
                          <span className="text-xs font-black text-amber-400 uppercase">{kpis.ultimo_incentivo.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                      {kpis.ultima_sancion && (
                        <div className="bg-danger/5 border border-danger/10 rounded-xl p-3">
                          <span className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-1">Última Sanción</span>
                          <span className="text-xs font-black text-danger uppercase">{kpis.ultima_sancion.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10 text-text-muted text-xs">No se pudieron cargar los KPIs</div>
              )}
            </div>
          )}

          {/* ── TAB: ZONA ────────────────────────────────────────────── */}
          {tab === 'zona' && puedeGestionarZona && (
            <div className="space-y-4">
              <div className="bg-[#1A1F2F] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-primary" />
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Zona de Estacionamiento</span>
                </div>

                {miembro.zona_asignada_id && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/15 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-black text-primary">{miembro.zona_nombre || 'Zona asignada'}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1 opacity-60">
                    Seleccionar nueva zona
                  </label>
                  <select
                    className="w-full h-11 bg-[#2F3445] border border-white/10 rounded-xl px-3 text-sm font-bold text-text-main focus:ring-1 focus:ring-primary outline-none appearance-none transition-all"
                    value={zonaSeleccionada}
                    onChange={(e) => setZonaSeleccionada(e.target.value)}
                  >
                    <option value="">— SIN ZONA (DESASIGNAR) —</option>
                    {zonas.map(z => (
                      <option key={z.id} value={z.id}>{z.nombre}</option>
                    ))}
                  </select>
                </div>

                <Boton
                  onClick={handleGuardarZona}
                  disabled={guardandoZona}
                  className="w-full h-11 bg-primary text-bg-app font-black uppercase tracking-[0.2em] rounded-xl text-xs"
                >
                  {guardandoZona ? 'Guardando...' : 'Confirmar Asignación'}
                </Boton>
              </div>

              <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest text-center opacity-50">
                La reasignación de zona entra en efecto de forma inmediata
              </p>
            </div>
          )}

          {/* ── TAB: INCENTIVOS ──────────────────────────────────────── */}
          {tab === 'incentivos' && (
            <div className="space-y-4">
              {/* Formulario */}
              <form onSubmit={handleAgregarIncentivo} className="bg-[#1A1F2F] rounded-xl p-4 space-y-3 border border-primary/10">
                <div className="flex items-center gap-2">
                  <Star size={13} className="text-amber-400" />
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Nuevo Incentivo</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1 opacity-60">Tipo</label>
                  <select
                    className="w-full h-11 bg-[#2F3445] border border-white/10 rounded-xl px-3 text-sm font-bold text-text-main focus:ring-1 focus:ring-primary outline-none appearance-none"
                    required value={nuevoInc.tipo}
                    onChange={(e) => setNuevoInc({ ...nuevoInc, tipo: e.target.value })}
                  >
                    <option value="">SELECCIONE...</option>
                    {TIPOS_INCENTIVO.map(t => (
                      <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1 opacity-60">Descripción</label>
                  <textarea
                    className="w-full bg-[#2F3445] border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-text-main focus:ring-1 focus:ring-primary outline-none resize-none placeholder:text-text-muted/40"
                    rows={2}
                    placeholder="Motivo del incentivo..."
                    required
                    value={nuevoInc.descripcion}
                    onChange={(e) => setNuevoInc({ ...nuevoInc, descripcion: e.target.value })}
                  />
                </div>

                <Boton type="submit" disabled={guardandoInc}
                  className="w-full h-10 bg-amber-400/20 text-amber-400 border border-amber-400/20 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-amber-400/30 transition-all">
                  {guardandoInc ? 'Registrando...' : '+ Otorgar Incentivo'}
                </Boton>
              </form>

              {/* Lista */}
              <div className="space-y-2">
                {incentivos.length === 0 ? (
                  <div className="text-center py-8 text-text-muted text-[10px] uppercase tracking-widest opacity-40">
                    Sin incentivos registrados
                  </div>
                ) : incentivos.map(inc => {
                  const est = ETIQUETA_INCENTIVO[inc.tipo] || { label: inc.tipo, color: 'text-text-muted bg-white/5 border-white/10' };
                  return (
                    <div key={inc.id} className="bg-[#1A1F2F] rounded-xl p-3 flex items-start gap-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest shrink-0 mt-0.5", est.color)}>
                        {est.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-text-main">{inc.descripcion}</p>
                        <p className="text-[9px] text-text-muted mt-0.5">
                          Por {inc.otorgado_por_nombre || 'Sistema'} · {new Date(inc.created_at).toLocaleDateString('es-VE')}
                        </p>
                      </div>
                      {['COMANDANTE','ADMIN_BASE','ADMIN_ENTIDAD'].includes(userActual.rol) && (
                        <button onClick={() => handleEliminarIncentivo(inc.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all shrink-0">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TAB: SANCIONES ───────────────────────────────────────── */}
          {tab === 'sanciones' && (
            <div className="space-y-4">
              {/* Formulario */}
              <form onSubmit={handleAgregarSancion} className="bg-[#1A1F2F] rounded-xl p-4 space-y-3 border border-danger/10">
                <div className="flex items-center gap-2">
                  <Shield size={13} className="text-danger" />
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Aplicar Sanción</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1 opacity-60">Tipo de Sanción</label>
                  <select
                    className="w-full h-11 bg-[#2F3445] border border-white/10 rounded-xl px-3 text-sm font-bold text-text-main focus:ring-1 focus:ring-danger outline-none appearance-none"
                    required value={nuevaSanc.tipo}
                    onChange={(e) => setNuevaSanc({ ...nuevaSanc, tipo: e.target.value })}
                  >
                    <option value="">SELECCIONE...</option>
                    {TIPOS_SANCION.map(t => (
                      <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1 opacity-60">Motivo</label>
                  <textarea
                    className="w-full bg-[#2F3445] border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-text-main focus:ring-1 focus:ring-danger outline-none resize-none placeholder:text-text-muted/40"
                    rows={2}
                    placeholder="Descripción de la infracción..."
                    required
                    value={nuevaSanc.motivo}
                    onChange={(e) => setNuevaSanc({ ...nuevaSanc, motivo: e.target.value })}
                  />
                </div>

                {nuevaSanc.tipo === 'relevo_inmediato' && (
                  <label className="flex items-center gap-2 cursor-pointer py-2 px-3 bg-danger/5 rounded-lg border border-danger/20 animate-in fade-in">
                    <input
                      type="checkbox"
                      className="accent-danger"
                      checked={nuevaSanc.ejecutar_inmediato}
                      onChange={(e) => setNuevaSanc({ ...nuevaSanc, ejecutar_inmediato: e.target.checked })}
                    />
                    <span className="text-[10px] font-black text-danger uppercase tracking-widest">
                      Ejecutar relevo inmediato (desactiva cuenta al instante)
                    </span>
                  </label>
                )}

                <Boton type="submit" disabled={guardandoSanc}
                  className="w-full h-10 bg-danger/10 text-danger border border-danger/20 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-danger/20 transition-all">
                  {guardandoSanc ? 'Aplicando...' : '⚠ Aplicar Sanción'}
                </Boton>
              </form>

              {/* Lista de sanciones */}
              <div className="space-y-2">
                {sanciones.length === 0 ? (
                  <div className="text-center py-8 text-text-muted text-[10px] uppercase tracking-widest opacity-40">
                    Sin sanciones registradas
                  </div>
                ) : sanciones.map(sanc => {
                  const etiq = ETIQUETA_SANCION[sanc.tipo] || { label: sanc.tipo, color: 'text-text-muted bg-white/5 border-white/10' };
                  const estado = ESTADO_SANCION[sanc.estado] || { label: sanc.estado, color: 'text-text-muted' };
                  return (
                    <div key={sanc.id} className="bg-[#1A1F2F] rounded-xl p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest shrink-0", etiq.color)}>
                          {etiq.label}
                        </span>
                        <span className={cn("text-[8px] font-black uppercase tracking-widest ml-auto shrink-0", estado.color)}>
                          {estado.label}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-text-main">{sanc.motivo}</p>
                      <p className="text-[9px] text-text-muted">
                        Por {sanc.sancionado_por_nombre || 'Sistema'} · {new Date(sanc.created_at).toLocaleDateString('es-VE')}
                      </p>

                      {/* Acciones de estado */}
                      {sanc.estado === 'activa' && ['COMANDANTE','ADMIN_BASE','ADMIN_ENTIDAD'].includes(userActual.rol) && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleActualizarSancion(sanc.id, 'cumplida')}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
                          >
                            <Check size={10} /> Marcar Cumplida
                          </button>
                          <button
                            onClick={() => handleActualizarSancion(sanc.id, 'apelada')}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-400/10 text-amber-400 text-[9px] font-black uppercase tracking-widest hover:bg-amber-400/20 transition-all"
                          >
                            <AlertCircle size={10} /> Apelar
                          </button>
                          {userActual.rol === 'COMANDANTE' && (
                            <button
                              onClick={() => handleEliminarSancion(sanc.id)}
                              className="ml-auto p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TAB: EDITAR ──────────────────────────────────────────── */}
          {tab === 'editar' && (
            <form onSubmit={handleGuardarEdit} className="space-y-4">
              <div className="bg-[#1A1F2F] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Edit2 size={13} className="text-primary" />
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Datos del Operativo</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input label="Nombres" required
                    value={editDatos.nombre}
                    onChange={(e) => setEditDatos({ ...editDatos, nombre: e.target.value.toUpperCase() })}
                  />
                  <Input label="Apellidos" required
                    value={editDatos.apellido}
                    onChange={(e) => setEditDatos({ ...editDatos, apellido: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input label="Teléfono" placeholder="0412-0000000"
                    value={editDatos.telefono}
                    onChange={(e) => setEditDatos({ ...editDatos, telefono: e.target.value })}
                  />
                  <Input label="Email" type="email"
                    value={editDatos.email}
                    onChange={(e) => setEditDatos({ ...editDatos, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Boton type="submit" disabled={guardandoEdit}
                  className="w-full h-12 bg-primary text-bg-app font-black uppercase tracking-[0.2em] rounded-xl">
                  {guardandoEdit ? 'Guardando...' : 'Guardar Cambios'}
                </Boton>
                <button type="button" onClick={() => setTab('kpis')}
                  className="w-full h-10 rounded-xl text-text-muted text-[10px] font-black uppercase tracking-widest hover:text-text-main transition-all">
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function Personal() {
  const { user: userActual } = useAuthStore();
  const [personal, setPersonal] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [miembroSeleccionado, setMiembroSeleccionado] = useState(null);

  const [nuevoMiembro, setNuevoMiembro] = useState({
    cedula: '', nombre: '', apellido: '', email: '',
    telefono: '', rol: '', entidad_id: null, password: ''
  });

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10;

  const fetchData = async () => {
    setLoading(true);
    try {
      const skip = page * limit;
      const data = await personalService.listar({ skip, limit, search });
      setPersonal(data);
      setHasMore(data.length === limit);

      if (['COMANDANTE', 'ADMIN_BASE'].includes(userActual.rol)) {
        try { const res = await api.get('/entidades'); setEntidades(res.data); } catch {}
      }

      // Cargar zonas para asignación
      try {
        const resZonas = await api.get('/zonas?limit=100');
        setZonas(resZonas.data);
      } catch {}

    } catch {
      toast.error('Error sincronizando fuerza de tareas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(fetchData, search ? 500 : 0);
    return () => clearTimeout(delay);
  }, [page, search]);

  const handleCrearPersonal = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...nuevoMiembro, password: nuevoMiembro.cedula };
      if (userActual.rol === 'ADMIN_ENTIDAD' && userActual.entidad_id)
        payload.entidad_id = userActual.entidad_id;

      await personalService.crear(payload);
      setIsModalOpen(false);
      setNuevoMiembro({ cedula: '', nombre: '', apellido: '', email: '', telefono: '', rol: '', entidad_id: null, password: '' });
      fetchData();
      toast.success('Alta de personal completada');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error en protocolo de alta');
    }
  };

  const handleToggleActivo = async (id) => {
    try {
      const updated = await personalService.toggleActivo(id);
      setPersonal(prev => prev.map(m => m.id === id ? updated : m));
      toast.success('Estado actualizado');
    } catch { toast.error('Error al cambiar privilegios'); }
  };

  const handleEliminar = async (id, nombre) => {
    if (!window.confirm(`¿Confirma la baja definitiva de ${nombre}?`)) return;
    try {
      await personalService.eliminar(id);
      setPersonal(prev => prev.filter(m => m.id !== id));
      if (miembroSeleccionado?.id === id) setMiembroSeleccionado(null);
      toast.success('Baja procesada');
    } catch { toast.error('Error en proceso de baja'); }
  };

  const handleUpdateMiembro = (updated) => {
    setPersonal(prev => prev.map(m => m.id === updated.id ? updated : m));
    setMiembroSeleccionado(updated);
  };

  const renderRolesDisponibles = () => {
    if (['COMANDANTE', 'ADMIN_BASE'].includes(userActual.rol)) {
      return (
        <>
          <option value="ADMIN_BASE">ADMINISTRADOR DE BASE</option>
          <option value="SUPERVISOR">SUPERVISOR DE GUARDIA</option>
          <option value="PARQUERO">PERSONA DE ACCESO (PARQUERO)</option>
          <option value="ALCABALA">OPERADOR DE ALCABALA</option>
          <option value="ADMIN_ENTIDAD">ADMINISTRADOR DE ENTIDAD</option>
          <option value="SUPERVISOR_PARQUEROS">SUPERVISOR DE PARQUEROS</option>
          <option value="SOCIO">SOCIO</option>
        </>
      );
    }
    return (
      <>
        <option value="SUPERVISOR_PARQUEROS">DIRECTOR DE OPERACIONES (SUPERVISOR)</option>
        <option value="PARQUERO">OPERADOR AUXILIAR (PARQUERO)</option>
      </>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 max-w-[1400px] mx-auto animate-in fade-in duration-500">

      {/* ─── Cabecera ─── */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-bg-card/30 p-4 md:p-5 rounded-2xl border border-white/5">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-text-main flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-primary/10 rounded-xl shrink-0">
              <UserCog className="text-primary" size={24} />
            </div>
            <span className="uppercase">Fuerza de Tareas</span>
          </h1>
          <p className="text-text-muted text-sm mt-1 flex items-center gap-1.5 px-1 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
            Control de personal operativo ({personal.length} en terminal)
          </p>
        </div>
        <Boton
          onClick={() => setIsModalOpen(true)}
          className="gap-2 h-11 px-6 w-full sm:w-auto shrink-0 bg-primary text-bg-app font-black uppercase tracking-widest text-[11px] rounded-xl shadow-tactica hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={18} />
          <span>Añadir Operativo</span>
        </Boton>
      </header>

      {/* ─── Barra de Búsqueda ─── */}
      <div className="flex gap-4 items-center bg-bg-card/20 p-2 rounded-2xl border border-white/5">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre, apellido o cédula..."
            className="w-full h-12 bg-bg-card border border-bg-high/10 rounded-xl pl-12 pr-4 text-sm font-bold text-text-main focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-text-muted/40"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
      </div>

      {/* ─── Listado ─── */}
      <section className="space-y-3">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse border border-white/5" />
          ))
        ) : (
          <>
            {personal.map(miembro => {
              const estilosActivos = getRolStyles(miembro.rol);
              const isSelected = miembroSeleccionado?.id === miembro.id;

              return (
                <Card
                  key={miembro.id}
                  className={cn(
                    "border transition-all group overflow-hidden relative rounded-xl cursor-pointer",
                    isSelected
                      ? 'bg-[#1A1F2F] border-primary/30 shadow-[0_0_20px_rgba(78,222,163,0.08)]'
                      : 'bg-bg-card border-white/5 hover:border-primary/20'
                  )}
                  onClick={() => setMiembroSeleccionado(isSelected ? null : miembro)}
                >
                  {/* Barra lateral de rol */}
                  <div className={cn("absolute left-0 top-0 h-full w-1 rounded-l-xl transition-all", miembro.activo ? estilosActivos.bar : 'bg-danger')} />

                  <CardContent className="p-4 pl-5 flex items-center gap-4">
                    {/* Avatar */}
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105",
                      miembro.activo ? estilosActivos.avatar : 'bg-danger/10 border-danger/20 text-danger'
                    )}>
                      <UserCircle size={26} />
                    </div>

                    {/* Datos */}
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest mb-1",
                        miembro.activo ? estilosActivos.badge : 'text-danger bg-danger/10 border-danger/20'
                      )}>
                        {miembro.activo ? miembro.rol.replace(/_/g, ' ') : 'INACTIVO'}
                      </div>

                      <h4 className="text-base font-black text-text-main uppercase tracking-tight leading-tight">
                        {miembro.nombre} {miembro.apellido}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                        <span className="text-[9px] text-text-muted font-black uppercase tracking-widest flex items-center gap-1">
                          <Hash size={9} className="text-primary shrink-0" />
                          {miembro.cedula}
                        </span>
                        {miembro.entidad_nombre && (
                          <span className="text-[9px] text-primary font-black uppercase tracking-widest flex items-center gap-1">
                            <Building2 size={9} className="shrink-0" />
                            {miembro.entidad_nombre}
                          </span>
                        )}
                        {miembro.zona_nombre && (
                          <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1">
                            <MapPin size={9} className="shrink-0" />
                            {miembro.zona_nombre}
                          </span>
                        )}
                        <span className="text-[9px] text-text-muted font-bold uppercase flex items-center gap-1">
                          <Phone size={9} className="shrink-0" />
                          {miembro.telefono || 'SIN TEL.'}
                        </span>
                      </div>
                    </div>

                    {/* Controles de mando */}
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {/* Botón expand */}
                      <button
                        onClick={() => setMiembroSeleccionado(isSelected ? null : miembro)}
                        className={cn(
                          "p-2 rounded-md transition-all",
                          isSelected ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-primary hover:bg-primary/10'
                        )}
                        title="Ver detalle"
                      >
                        {isSelected ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {['COMANDANTE', 'ADMIN_BASE', 'ADMIN_ENTIDAD'].includes(userActual.rol) && (
                        <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5">
                          <button
                            onClick={() => handleToggleActivo(miembro.id)}
                            className={cn("p-2 rounded-md transition-all", miembro.activo ? 'text-warning hover:bg-warning/10' : 'text-success hover:bg-success/10')}
                            title={miembro.activo ? 'Pausar Acceso' : 'Reactivar Acceso'}
                          >
                            {miembro.activo ? <Power size={16} /> : <RotateCcw size={16} />}
                          </button>
                          {userActual.rol === 'COMANDANTE' && (
                            <button
                              onClick={() => handleEliminar(miembro.id, miembro.nombre)}
                              className="p-2 rounded-md text-danger hover:bg-danger/10 transition-all"
                              title="Dar de Baja Permanente"
                            >
                              <UserMinus size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {personal.length === 0 && (
              <div className="py-20 text-center border border-dashed border-white/10 rounded-xl bg-bg-card/20">
                <UserCog size={48} className="mx-auto text-text-muted mb-4 opacity-15" />
                <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                  Sin operativos vinculados a esta terminal
                </p>
              </div>
            )}
          </>
        )}
      </section>

      {/* ─── Paginación ─── */}
      {!loading && (personal.length > 0 || page > 0) && (
        <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-4">
          <Boton variant="ghost" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
            className="gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-30">
            <ChevronLeft size={16} /> Anterior
          </Boton>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Sector Acceso</span>
            <span className="text-sm font-display font-black text-primary">PÁGINA {page + 1}</span>
          </div>
          <Boton variant="ghost" disabled={!hasMore} onClick={() => setPage(p => p + 1)}
            className="gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-30">
            Siguiente <ChevronRight size={16} />
          </Boton>
        </div>
      )}

      {/* ─── Panel de Detalle (sheet sobre la pantalla) ─── */}
      {miembroSeleccionado && (
        <PanelDetalle
          miembro={miembroSeleccionado}
          onClose={() => setMiembroSeleccionado(null)}
          userActual={userActual}
          zonas={zonas}
          onUpdate={handleUpdateMiembro}
        />
      )}

      {/* ─── Modal Alta de Personal ─── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="PROTOCOLO DE ALTA — PERSONAL">
        <form onSubmit={handleCrearPersonal} className="space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <BadgeCheck size={13} className="text-primary" />
              <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Identificación y Rango</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Documento de Identidad" required placeholder="V-0000000"
                value={nuevoMiembro.cedula}
                onChange={(e) => setNuevoMiembro({ ...nuevoMiembro, cedula: e.target.value.toUpperCase() })}
              />
              <Input label="Teléfono" placeholder="0412-0000000"
                value={nuevoMiembro.telefono}
                onChange={(e) => setNuevoMiembro({ ...nuevoMiembro, telefono: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Nombres" required placeholder="EJ: PEDRO JAVIER"
                value={nuevoMiembro.nombre}
                onChange={(e) => setNuevoMiembro({ ...nuevoMiembro, nombre: e.target.value.toUpperCase() })}
              />
              <Input label="Apellidos" required placeholder="EJ: RODRIGUEZ"
                value={nuevoMiembro.apellido}
                onChange={(e) => setNuevoMiembro({ ...nuevoMiembro, apellido: e.target.value.toUpperCase() })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1 opacity-60">Rango Operativo</label>
                <select
                  className="w-full h-11 bg-bg-card border border-white/10 rounded-xl px-3 text-sm font-bold text-text-main focus:ring-1 focus:ring-primary outline-none appearance-none transition-all"
                  required value={nuevoMiembro.rol}
                  onChange={(e) => setNuevoMiembro({ ...nuevoMiembro, rol: e.target.value })}
                >
                  <option value="">SELECCIONE...</option>
                  {renderRolesDisponibles()}
                </select>
              </div>
              <Input label="Email del Operador" type="email" placeholder="operador@bagfm.com"
                value={nuevoMiembro.email}
                onChange={(e) => setNuevoMiembro({ ...nuevoMiembro, email: e.target.value })}
              />
            </div>

            {(['PARQUERO','SUPERVISOR_PARQUEROS','ADMIN_ENTIDAD','ALCABALA'].includes(nuevoMiembro.rol)) &&
             (['COMANDANTE','ADMIN_BASE'].includes(userActual.rol)) && (
              <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1 opacity-60">Asignación de Destino</label>
                <select
                  className="w-full h-11 bg-bg-card border border-white/10 rounded-xl px-3 text-sm font-bold text-text-main focus:ring-1 focus:ring-primary outline-none appearance-none transition-all"
                  required value={nuevoMiembro.entidad_id || ''}
                  onChange={(e) => setNuevoMiembro({ ...nuevoMiembro, entidad_id: e.target.value })}
                >
                  <option value="">ASIGNAR ENTIDAD...</option>
                  {entidades.map(ent => (
                    <option key={ent.id} value={ent.id}>{ent.nombre}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 space-y-3">
            <Boton type="submit" className="w-full h-14 bg-primary text-bg-app font-black uppercase tracking-[0.2em] rounded-xl shadow-tactica">
              Finalizar Alta de Personal
            </Boton>
            <p className="text-[9px] text-center text-text-muted uppercase font-bold tracking-widest opacity-50 italic">
              La cédula se usará como clave de acceso inicial.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
