import React from 'react';
import { Activity, Wifi, Gauge, Map, BarChart2 } from 'lucide-react';

export default function Header({ 
  pestañaActiva, 
  setPestañaActiva, 
  estadoGlobal = "Requires attention", 
  ultimoPaquete = "00:00:00" 
}) {
  return (
    <div className="w-full bg-[#0d1527] border-b border-[#1e293b] flex flex-col select-none">
      
      {/*  LOGO, TITULOS Y STATUS */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1e293b]/50">
      
        <div className="flex items-center gap-4">
          <div className="relative bg-[#1e293b] p-2.5 rounded-xl border border-slate-700/80 flex items-center justify-center text-sky-400">
            <Activity className="w-5 h-5" />
            <span className="absolute top-0 right-0 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 tracking-wide">
              Metropolitan Technological Institute
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Environmental Monitoring System — EcoRover
            </p>
          </div>
        </div>

        {/* Status Global y Hora */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 px-3.5 py-1.5 rounded-xl text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>{estadoGlobal}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 text-slate-400 text-xs font-mono bg-slate-900/40 rounded-lg border border-slate-800/80">
            <Wifi className="w-3.5 h-3.5 text-slate-500" />
            <span>{ultimoPaquete}</span>
          </div>
        </div>
      </div>

      {/*SELECTOR DE PESTAÑAS*/}
      <div className="px-6 flex gap-6 text-xs font-bold tracking-wide">
        
        {/* Pestaña 1: Sensores */}
        <button
          onClick={() => setPestañaActiva('sensores')}
          className={`flex items-center gap-2 py-3 border-b-2 font-semibold transition-all duration-150 ${
            pestañaActiva === 'sensores' 
              ? 'border-orange-500 text-slate-100' 
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span>Sensors</span>
        </button>

        {/* Pestaña 2: Mapa GPS */}
        <button
          onClick={() => setPestañaActiva('gps')}
          className={`flex items-center gap-2 py-3 border-b-2 font-semibold transition-all duration-150 ${
            pestañaActiva === 'gps' 
              ? 'border-orange-500 text-slate-100' 
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Map className="w-4 h-4" />
          <span>GPS map</span>
        </button>

        {/* Pestaña 3: Mapa Calor */}
        <button
          onClick={() => setPestañaActiva('mapaCalor')}
          className={`flex items-center gap-2 py-3 border-b-2 font-semibold transition-all duration-150 ${
            pestañaActiva === 'mapaCalor' 
              ? 'border-orange-500 text-slate-100' 
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Map className="w-4 h-4" />
          <span>HeatMap</span>
        </button>

        {/* Pestaña 4: Historico */}
        <button
          onClick={() => setPestañaActiva('historico')}
          className={`flex items-center gap-2 py-3 border-b-2 font-semibold transition-all duration-150 ${
            pestañaActiva === 'historico' 
              ? 'border-orange-500 text-slate-100' 
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Historical</span>
        </button>

      </div>
    </div>
  );
}
