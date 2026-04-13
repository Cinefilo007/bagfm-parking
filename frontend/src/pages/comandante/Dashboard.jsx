import React, { useState, useEffect } from 'react';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Target, CarFront, ShieldAlert, AlertTriangle } from 'lucide-react';
import MapaTactico from '../../components/MapaTactico';
import EventMonitor from '../../components/dashboard/EventMonitor';
import { mapaService } from '../../services/mapaService';

export default function DashboardComando() {
  const [situacion, setSituacion] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const data = await mapaService.getSituacion();
      setSituacion(data);
    } catch (error) {
      console.error("Error actualizando dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // Polling cada 10s
    return () => clearInterval(interval);
  }, []);

  const stats = situacion ? [
    { label: 'Vehículos Dentro', valor: situacion.vehiculos_dentro, highlight: false, icon: CarFront },
    { label: 'Accesos Hoy', valor: situacion.total_accesos_hoy, highlight: false, icon: Target },
    { label: 'Infracciones Activas', valor: situacion.alertas_activas, highlight: 'alerta', icon: AlertTriangle },
    { label: 'Bloqueados', valor: situacion.bloqueados_total || 0, highlight: 'error', icon: ShieldAlert },
  ] : [];

  return (
    <div className="min-h-screen bg-bg-app">
      <Header 
        titulo="Centro de Comando" 
        subtitle="ESTADO OPERATIVO // BAGFM" 
      />
      
      <main className="px-4 lg:px-8 mt-[-1rem] pb-24">
        {/* KPI ROW: 4 tarjetas alineadas en pantallas grandes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => {
            const Icono = stat.icon;
            return (
              <Card key={i} elevation={2} className="flex flex-col relative overflow-hidden group hover:bg-bg-high transition-all border-bg-high/10">
                <div className="flex justify-between items-start mb-4">
                  <Icono 
                    size={24} 
                    className={
                      stat.highlight === 'alerta' ? 'text-warning' : 
                      stat.highlight === 'error' ? 'text-danger' : 
                      'text-primary/70'
                    } 
                  />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/20 group-hover:bg-primary/50 transition-colors"></div>
                </div>
                
                <div 
                  className={`font-display font-black text-4xl tracking-tighter leading-none mb-1 ${
                    stat.highlight === 'alerta' ? 'text-warning' : 
                    stat.highlight === 'error' ? 'text-danger' : 'text-text-main'
                  }`}
                >
                  {stat.valor}
                </div>
                
                <div className="text-[9px] uppercase font-black tracking-widest text-text-muted">
                  {stat.label}
                </div>
              </Card>
            );
          })}
        </div>

        {/* BOTTOM SECTION: 50/50 Map and Events */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch h-[550px]">
          
          {/* Columna Izquierda: Mapa Táctico */}
          <div className="flex flex-col h-full">
             <MapaTactico pollingEnabled={false} situacionPreload={situacion} />
          </div>

          {/* Columna Derecha: Monitor de Eventos */}
          <div className="h-full">
             <EventMonitor eventos={situacion?.eventos_recientes} />
          </div>

        </div>
      </main>
    </div>
  );
}
