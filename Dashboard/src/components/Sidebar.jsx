import React from 'react';
import { MapPin } from 'lucide-react';

export default function Sidebar({ zonaSeleccionada, setZonaSeleccionada }) {
  // Datos estructurados de las zonas basados exactamente en tu captura de pantalla
  const zonas = [
    { id: 'Patio', nombre: 'Patio Principal', estado: 'critico', colorIcono: 'text-red-500' },
    { id: 'Aula', nombre: 'Aula 101', estado: 'normal', colorIcono: 'text-emerald-500' },
    { id: 'Biblioteca', nombre: 'Biblioteca', estado: 'normal', colorIcono: 'text-emerald-500' },
    { id: 'Ciencias', nombre: 'Lab. Ciencias', estado: 'atencion', colorIcono: 'text-amber-500' },
    { id: 'Cafeteria', nombre: 'Cafetería', estado: 'critico', colorIcono: 'text-red-500' },
    { id: 'Pasillo', nombre: 'Pasillo Norte', estado: 'atencion', colorIcono: 'text-amber-500' },
  ];

  // Función auxiliar para pintar el LED de estado derecho
  const obtenerLedEstado = (estado) => {
    if (estado === 'normal') return 'bg-emerald-500';
    if (estado === 'atencion') return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <aside className="w-64 bg-[#090f1d] border-r border-[#1e293b] flex flex-col justify-between p-4 text-slate-300">
      
      {/* SECCIÓN SUPERIOR: LISTA DE ZONAS */}
      <div>
        {/* Contador de zonas */}
        <div className="text-[11px] font-bold tracking-widest text-slate-500 px-3 mb-4">
          Zonas · {zonas.length}
        </div>

        {/* Contenedor de navegación */}
        <nav className="space-y-1">
          {zonas.map((zona) => {
            const estaActivo = zonaSeleccionada === zona.id;
            return (
              <button
                key={zona.id}
                onClick={() => setZonaSeleccionada(zona.id)}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-150 text-sm font-medium ${
                  estaActivo 
                    ? 'bg-[#16223f] text-white border-l-2 border-red-500 pl-2.5 shadow-inner' 
                    : 'hover:bg-[#111a30]/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                {/* Lado izquierdo: Ícono + Nombre */}
                <div className="flex items-center gap-3">
                  <MapPin className={`w-4 h-4 ${zona.colorIcono}`} />
                  <span>{zona.nombre}</span>
                </div>

                {/* Lado derecho: LED de Estado */}
                <span className={`w-2 h-2 rounded-full ${obtenerLedEstado(zona.estado)}`}></span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* SECCIÓN INFERIOR: LEYENDA SEMÁNTICA */}
      <div className="border-t border-[#1e293b]/60 pt-4 px-3 space-y-2 text-xs font-medium text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Normal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Atención</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          <span>Crítico</span>
        </div>
      </div>

    </aside>
  );
}