import React from 'react';
import { Thermometer, Droplets, Volume2, Sun, Wind } from 'lucide-react';

export default function GridTarjetas({ datos }) {
  // Funcion para determinar el estado de riesgo de cada sensor 
  const obtenerEstadoMétrica = (valor, tipo) => {
    if (tipo === 'temp') return valor >= 27.0 ? 'ATTENTION' : 'NORMAL';
    if (tipo === 'hum') return valor >= 60.0 ? 'ATTENTION' : 'NORMAL';
     if (tipo === 'lum') return valor >= 60.0 ? 'ATTENTION' : 'NORMAL';
    if (tipo === 'ruido') return valor >= 55.0 ? 'ATTENTION' : 'NORMAL';
    if (tipo === 'pm25') return valor >= 12.0 ? 'ATTENTION' : 'NORMAL';
    return 'NORMAL'; // Por defecto
  };

  const obtenerEstiloBadge = (estado) => {
    if (estado === 'CRITICAL') return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (estado === 'ATTENTION') return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  };

  return (

    // Cards de cada una de las variables del sensor
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      
      <CardSensor 
        titulo="Temperature" valor={datos.temperatura} unidad="°C" 
        estado={obtenerEstadoMétrica(datos.temperatura, 'temp')} obtenerEstiloBadge={obtenerEstiloBadge} 
        icono={<Thermometer className="text-orange-400 w-4 h-4" />} maxBarra={40} idParaAnimacion="Temperatura"
      />

      <CardSensor 
        titulo="Humidity" valor={datos.humedad} unidad="%" 
        estado={obtenerEstadoMétrica(datos.humedad, 'hum')} obtenerEstiloBadge={obtenerEstiloBadge} 
        icono={<Droplets className="text-sky-400 w-4 h-4" />} maxBarra={100} idParaAnimacion="Humedad"
      />

      <CardSensor 
        titulo="Noise" valor={datos.ruido} unidad="dB" 
        estado={obtenerEstadoMétrica(datos.ruido, 'ruido')} obtenerEstiloBadge={obtenerEstiloBadge} 
        icono={<Volume2 className="text-indigo-400 w-4 h-4" />} maxBarra={120} idParaAnimacion="Ruido"
      />

      <CardSensor 
        titulo="Brightness" valor={datos.luminosidad} unidad="lux" 
        estado={obtenerEstadoMétrica(datos.luminosidad, 'lum')} obtenerEstiloBadge={obtenerEstiloBadge} 
        icono={<Sun className="text-amber-400 w-4 h-4" />} maxBarra={1000} idParaAnimacion="Luminosidad"
      />

      <CardSensor 
        titulo={<span>PM<sub>1.0</sub></span>} valor={datos.pm10} unidad="µg/m³" 
        estado={obtenerEstadoMétrica(datos.pm10, 'pm10')} obtenerEstiloBadge={obtenerEstiloBadge} 
        icono={<Wind className="text-emerald-400 w-4 h-4" />} maxBarra={50} idParaAnimacion="PM1.0"
      />

      <CardSensor 
        titulo={<span>PM<sub>2.5</sub></span>} valor={datos.pm25} unidad="µg/m³" 
        estado={obtenerEstadoMétrica(datos.pm25, 'pm25')} obtenerEstiloBadge={obtenerEstiloBadge} 
        icono={<Wind className="text-emerald-400 w-4 h-4" />} maxBarra={50} idParaAnimacion="PM2.5"
      />

      <CardSensor 
        titulo={<span>PM<sub>10</sub></span>} valor={datos.pm100} unidad="µg/m³" 
        estado={obtenerEstadoMétrica(datos.pm100, 'pm100')} obtenerEstiloBadge={obtenerEstiloBadge} 
        icono={<Wind className="text-emerald-400 w-4 h-4" />} maxBarra={200} idParaAnimacion="PM10"
      />

    </div>
  );
}

function CardSensor({ titulo, valor, unidad, estado, obtenerEstiloBadge, icono, maxBarra, idParaAnimacion }) {
  
  // ASIGNACION DINAMICA DE GAMAS DE COLOR 
  const obtenerConfiguracionColor = (estadoActual, id) => {
    if (estadoActual === 'CRITICAL') {
      return {
        texto: 'text-red-400',
        barra: 'bg-red-500',
        glow: 'border-red-500/20 hover:border-red-500/60 hover:shadow-[0_0_15px_rgba(239,68,68,0.12)] hover:ring-1 hover:ring-red-500/20'
      };
    }
    if (estadoActual === 'ATTENTION') {
      return {
        texto: 'text-amber-500',
        barra: 'bg-amber-500',
        glow: 'border-amber-500/20 hover:border-amber-500/60 hover:shadow-[0_0_15px_rgba(245,158,11,0.12)] hover:ring-1 hover:ring-amber-500/20'
      };
    }
    
    // Gamas normales por sensor individuales 
    let colorBase = 'emerald';
    let rgbGlow = '16,185,129';
    if (id === 'Humedad') { colorBase = 'sky'; rgbGlow = '56,189,248'; }
    if (id === 'Ruido') { colorBase = 'indigo'; rgbGlow = '129,140,248'; }
    if (id === 'PM10') { colorBase = 'cyan'; rgbGlow = '6,182,212'; }

    return {
      texto: `text-${colorBase}-400`,
      barra: `bg-${colorBase}-500`,
      glow: `border-${colorBase}-500/20 hover:border-${colorBase}-500/50 hover:shadow-[0_0_15px_rgba(${rgbGlow},0.08)] hover:ring-1 hover:ring-${colorBase}-500/20`
    };
  };

  const configColor = obtenerConfiguracionColor(estado, idParaAnimacion);

  // Calcular el porcentaje de llenado de la barra inferior
  const porcentajeBarra = Math.min((valor / maxBarra) * 100, 100);

  return (
    <div className={`bg-[#0d1527] border rounded-xl p-4 flex flex-col justify-between h-36 cursor-pointer
      transition-all duration-300 ease-out transform hover:-translate-y-0.5 ${configColor.glow}`}
    >
      {/* SECCION SUPERIOR */}
      <div className="flex justify-between items-center">
        <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
          {icono}
        </div>
        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${obtenerEstiloBadge(estado)}`}>
          {estado}
        </span>
      </div>

      {/* SECCION CENTRAL */}
      <div className="mt-2 flex flex-col justify-end flex-1 mb-2">
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold font-mono tracking-tight ${configColor.texto}`}>
            {valor.toFixed(1)}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">{unidad}</span>
        </div>
        <p className="text-xs text-slate-500 font-medium mt-0.5">{titulo}</p>
      </div>

      {/*  BARRA DE ESTADO DINAMICA */}
      <div className="w-full bg-slate-900/80 h-1 rounded-full overflow-hidden border border-slate-800/20">
        <div 
          className={`${configColor.barra} h-full rounded-full transition-all duration-500 ease-out`} 
          style={{ width: `${porcentajeBarra}%` }}
        ></div>
      </div>

    </div>
  );
}