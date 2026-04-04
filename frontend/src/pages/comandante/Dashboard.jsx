import React from 'react';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Target, CarFront, ShieldAlert, AlertTriangle } from 'lucide-react';
import MapaTactico from '../../components/MapaTactico';

export default function DashboardComando() {
  // Stats quemados por ahora, en futura iteración se sacan de react-query/axios
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
      
      <main className="px-4 py-6 pb-24 max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, i) => {
            const Icono = stat.icon;
            return (
              <Card key={i} elevation={2} className="flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <Icono 
                    size={28} 
                    className={
                      stat.highlight === 'alerta' ? 'text-warning' : 
                      stat.highlight === 'error' ? 'text-danger' : 
                      'text-primary/70'
                    } 
                  />
                  {/* Punteo de estetica en la esquina */}
                  <div className="w-1.5 h-1.5 rounded-full bg-text-muted/30"></div>
                </div>
                
                <div 
                  className={`font-display font-bold text-[3rem] tracking-tighter leading-none mb-2 ${
                    stat.highlight === 'alerta' ? 'text-warning' : 
                    stat.highlight === 'error' ? 'text-danger' : 'text-text-main'
                  }`}
                >
                  {stat.valor}
                </div>
                
                <div className="text-[10px] uppercase font-semibold tracking-widest text-text-muted">
                  {stat.label}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Sección Últimos Accesos (Estructura Base) */}
        <div className="mt-8">
          <h3 className="font-display font-semibold text-lg text-text-main uppercase tracking-widest border-b border-text-muted/20 pb-2 mb-4">
             Registro Táctico (Últimas Entradas)
          </h3>
          <div className="mb-6 h-[400px]">
            <MapaTactico />
          </div>
          <div className="space-y-3">
             <Card elevation={1} className="flex items-center justify-between opacity-70">
                <div className="text-text-sec text-xs italic tracking-widest text-center w-full">
                  Módulo en Desarrollo
                </div>
             </Card>
          </div>
        </div>

      </main>
    </div>
  );
}
