import React from 'react';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Target, CarFront, ShieldAlert, AlertTriangle } from 'lucide-react';
import MapaTactico from '../../components/MapaTactico';

export default function DashboardComando() {
  const stats = [
    { label: 'Vehículos Dentro', valor: 47, highlight: false, icon: CarFront },
    { label: 'Accesos Hoy', valor: 128, highlight: false, icon: Target },
    { label: 'Infracciones Activas', valor: 3, highlight: 'alerta', icon: AlertTriangle },
    { label: 'Bloqueados', valor: 1, highlight: 'error', icon: ShieldAlert },
  ];

  return (
    <div className="min-h-screen bg-bg-app">
      <Header 
        titulo="Centro de Comando" 
        subtitle="ESTADO OPERATIVO // BAGFM" 
      />
      
      <main className="px-4 py-6 lg:px-8">
        {/* Layout de Rejilla Adaptativa (50/50 en Desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          
          {/* Columna Izquierda: Stats */}
          <div className="flex flex-col gap-6 pt-2">
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, i) => {
                const Icono = stat.icon;
                return (
                  <Card key={i} elevation={2} className="flex flex-col relative overflow-hidden group hover:bg-bg-high transition-all">
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
                      className={`font-display font-bold text-4xl tracking-tighter leading-none mb-1 ${
                        stat.highlight === 'alerta' ? 'text-warning' : 
                        stat.highlight === 'error' ? 'text-danger' : 'text-text-main'
                      }`}
                    >
                      {stat.valor}
                    </div>
                    
                    <div className="text-[9px] uppercase font-bold tracking-widest text-text-muted">
                      {stat.label}
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Ultimas Alertas (Placeholder estético) */}
            <div className="mt-4 p-4 border border-bg-high/20 rounded-xl bg-bg-low/30">
               <span className="text-[10px] font-mono text-text-muted uppercase">Logs del Sistema: 1h ago</span>
               <p className="text-[11px] text-text-sec mt-2 italic">No se detectan intrusiones perimetrales. Sensores operativos.</p>
            </div>
          </div>

          {/* Columna Derecha: Mapa Táctico (Ahora ocupa el 50%) */}
          <div className="flex flex-col h-full pt-2">
            <div className="flex-1 min-h-[450px]">
               <MapaTactico />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
