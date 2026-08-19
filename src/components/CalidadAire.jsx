import React from 'react';

export default function CalidadAire({ datos }) {
  // Función para calcular porcentaje de llenado de la barra
  const calcularPorcentaje = (valor, max) => Math.min((valor / max) * 100, 100);

  return (
    <div className="bg-[#0d1527] border border-slate-800/80 rounded-xl p-6 space-y-5">
      <h3 className="text-sm font-bold text-slate-200 tracking-wide">Air quality</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Barra 1: PM1.0 */}
        <ProgressBar label={<span>PM<sub>1.0</sub></span>} valor={datos.pm10} max={50} color="bg-emerald-400" />
        {/* Barra 2: PM2.5 */}
        <ProgressBar label={<span>PM<sub>2.5</sub></span>} valor={datos.pm25} max={50} color="bg-emerald-400" />
        {/* Barra 3: PM10 */}
        <ProgressBar label={<span>PM<sub>10</sub></span>} valor={datos.pm100} max={200} color="bg-emerald-400" />
      </div>
      
    </div>
  );
}

function ProgressBar({ label, valor, max, color }) {
  const pct = Math.min((valor / max) * 100, 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline text-xs font-semibold">
        <span className="text-slate-500 font-mono text-[11px]">{label}</span>
        <span className="text-emerald-400 font-mono text-sm">{valor} <span className="text-[10px] text-slate-500 font-sans font-medium">µg/m³</span></span>
      </div>
      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800/40">
        <div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
      </div>
      <div className="flex justify-between text-[10px] font-mono font-bold text-slate-600">
        <span>0</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
