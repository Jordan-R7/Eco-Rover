import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function GraficaTendencia({ datosHistoricos, zonaNombre }) {

  const [lineasVisibles, setLineasVisibles] = useState({
    Temp: true,
    Hum: true,
    Ruido: true,
    Lum: true,
    PM10: true,  // PM1.0
    PM25: true,  // PM2.5
    PM100: true  // pm10
  });

  const toggleLinea = (llave) => {
    setLineasVisibles(prev => ({
      ...prev,
      [llave]: !prev[llave]
    }));
  };

  return (
    <div className="bg-[#0d1527] border border-slate-800/80 rounded-xl p-6 space-y-15">
      
      {/* BARRA SUPERIOR DE FILTROS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-200 tracking-wide">Today's trend</h3>
        </div>
        
        {/* BOTONES INTERACTIVOS */}
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold select-none">
          <button 
            onClick={() => toggleLinea('Temp')}
            className={`px-3 py-1 rounded-full border transition-all duration-200 cursor-pointer ${
              lineasVisibles.Temp ? 'bg-orange-500/10 border-orange-500/40 text-orange-400 font-bold' : 'bg-slate-900/40 border-slate-800 text-slate-600 line-through'
            }`}
          >
            ● Temperature
          </button>

          <button 
            onClick={() => toggleLinea('Hum')}
            className={`px-3 py-1 rounded-full border transition-all duration-200 cursor-pointer ${
              lineasVisibles.Hum ? 'bg-sky-500/10 border-sky-500/40 text-sky-400 font-bold' : 'bg-slate-900/40 border-slate-800 text-slate-600 line-through'
            }`}
          >
            ● Humidity
          </button>

          <button 
            onClick={() => toggleLinea('Lum')}
            className={`px-3 py-1 rounded-full border transition-all duration-200 cursor-pointer ${
              lineasVisibles.Lum ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 font-bold' : 'bg-slate-900/40 border-slate-800 text-slate-600 line-through'
            }`}
          >
            ● Brightness
          </button>

          <button 
            onClick={() => toggleLinea('Ruido')}
            className={`px-3 py-1 rounded-full border transition-all duration-200 cursor-pointer ${
              lineasVisibles.Ruido ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 font-bold' : 'bg-slate-900/40 border-slate-800 text-slate-600 line-through'
            }`}
          >
            ● Noise
          </button>

          <button 
            onClick={() => toggleLinea('PM10')}
            className={`px-3 py-1 rounded-full border transition-all duration-200 cursor-pointer ${
              lineasVisibles.PM10 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold' : 'bg-slate-900/40 border-slate-800 text-slate-600 line-through'
            }`}
          >
            ● PM1.0
          </button>

          <button 
            onClick={() => toggleLinea('PM25')}
            className={`px-3 py-1 rounded-full border transition-all duration-200 cursor-pointer ${
              lineasVisibles.PM25 ? 'bg-teal-500/10 border-teal-500/40 text-teal-400 font-bold' : 'bg-slate-900/40 border-slate-800 text-slate-600 line-through'
            }`}
          >
            ● PM2.5
          </button>

          <button 
            onClick={() => toggleLinea('PM100')}
            className={`px-3 py-1 rounded-full border transition-all duration-200 cursor-pointer ${
              lineasVisibles.PM100 ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 font-bold' : 'bg-slate-900/40 border-slate-800 text-slate-600 line-through'
            }`}
          >
            ● PM10
          </button>
        </div>
      </div>

      {/* AREA DE RENDERIZADO */}
      <div className="h-75 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={datosHistoricos} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            
            <defs>
              <linearGradient id="glowTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="glowHum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="glowLum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="glowRuido" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="glowPM10" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="glowPM25" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="glowPM100" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="hora" stroke="#475569" fontSize={11} tickLine={false} />
            <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} domain={['auto', 'auto']} ticks={[0, 20, 40, 60, 80]} />
            
            <Tooltip contentStyle={{ backgroundColor: '#070b14', borderColor: '#1e293b', color: '#fff', fontSize: '12px', borderRadius: '12px' }} />
                        
            {lineasVisibles.Temp && (
              <Area 
                type="monotone" dataKey="Temp" stroke="#f97316" strokeWidth={2} 
                fillOpacity={1} fill="url(#glowTemp)" 
                isAnimationActive={true} animationDuration={1600} easing="ease-in-out"
              />
            )}
            
            {lineasVisibles.Hum && (
              <Area 
                type="monotone" dataKey="Hum" stroke="#38bdf8" strokeWidth={2} 
                fillOpacity={1} fill="url(#glowHum)" 
                isAnimationActive={true} animationDuration={1600} easing="ease-in-out"
              />
            )}

            {lineasVisibles.Lum && (
              <Area 
                type="monotone" dataKey="Lum" stroke="#fbbf24" strokeWidth={2} 
                fillOpacity={1} fill="url(#glowLum)" 
                isAnimationActive={true} animationDuration={1600} easing="ease-in-out"
              />
            )}

            {lineasVisibles.Ruido && (
              <Area 
                type="monotone" dataKey="Ruido" stroke="#818cf8" strokeWidth={2} 
                fillOpacity={1} fill="url(#glowRuido)" 
                isAnimationActive={true} animationDuration={1600} easing="ease-in-out"
              />
            )}
            
            {lineasVisibles.PM10 && (
              <Area 
              type="monotone" dataKey="PM10" stroke="#10b981" strokeWidth={2} 
              fillOpacity={1} fill="url(#glowPM10)" 
              isAnimationActive={true} animationDuration={1200} easing="ease-in-out" />
            )}

            {lineasVisibles.PM25 && (
              <Area type="monotone" dataKey="PM25" stroke="#14b8a6" strokeWidth={2} 
              fillOpacity={1} fill="url(#glowPM25)" 
              isAnimationActive={true} animationDuration={1200} easing="ease-in-out" />
            )}

            {lineasVisibles.PM100 && (
              <Area type="monotone" dataKey="PM100" stroke="#06b6d4" strokeWidth={2} 
              fillOpacity={1} fill="url(#glowPM100)" 
              isAnimationActive={true} animationDuration={1200} easing="ease-in-out" />
            )}

          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}