import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Calendar, Layers, BarChart2 } from 'lucide-react';

export default function Historico() {
  // ESTADOS DE CONTROL DE FILTROS 
  const [periodo, setPeriodo] = useState('Week'); // 'Semana' | 'Mes' | 'Año'
  const [tipoGrafica, setTipoGrafica] = useState('Area'); // 'Area' | 'Barras'
  const [variable, setVariable] = useState('Temperature'); // 'Temperatura' | 'Humedad' | 'Ruido' | 'Luminosidad' | 'PM1.0' | 'PM2.5' | 'PM10'

  // Estado para guardar los datos reales descargados desde la nube
  const [datosReales, setDatosReales] = useState([]);
  const [cargando, setCargando] = useState(false);

  const CHANNEL_ID = "3421848"; 

  // Traduccion de las variables de ingles a español
  const CLAVE_INTERNA = useMemo(() => ({
    Temperature: 'Temperatura',
    Humidity: 'Humedad',
    Noise: 'Ruido',
    Brightness: 'Luminosidad',
    'PM1.0': 'PM10',
    'PM2.5': 'PM25',
    'PM10': 'PM100',
  }), []);

 useEffect(() => {
    const descargarHistorico = async (esPrimeraCarga) => {
       if (esPrimeraCarga) setCargando(true);

      // le pedimos a ThingSpeak una cantidad de muestras consecutivas en vivo:
      let rangoDias = "days=7";
      if (periodo === 'Month') rangoDias = "days=31";
      if (periodo === 'Year') rangoDias = "days=366";

      const URL_API = `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?${rangoDias}&results=8000&api_key=H1R36C74DFHPATBM`;

      try {
        const respuesta = await fetch(URL_API);
        
        if (!respuesta.ok) {
          throw new Error(`Error en el servidor de ThingSpeak: ${respuesta.status}`);
        }

        const json = await respuesta.json();

        if (json.feeds) {
          const datosFormateados = json.feeds
            .filter(feed => feed.field1 !== null) 
            .map(feed => ({
              fechaISO: feed.created_at,
              Temperatura: parseFloat(feed.field1) || 0,
              Humedad: parseFloat(feed.field2) || 0,
              Ruido: parseFloat(feed.field3) || 0,
              Luminosidad: parseFloat(feed.field4) || 0,
              PM10: parseFloat(feed.field5) || 0,   // pm1.0
              PM25: parseFloat(feed.field6) || 0,   // pm2.5
              PM100: parseFloat(feed.field7) || 0   // pm10
            }));

          setDatosReales(datosFormateados);
        }
      } catch (error) {
        console.error("Error al descargar el histórico:", error);
      } finally {
        if (esPrimeraCarga) setCargando(false);
      }
    };

    descargarHistorico(true);

    // Actualizar cada 60 segundos
    const intervalo = setInterval(() => descargarHistorico(false), 60000);
    return () => clearInterval(intervalo);

  }, [periodo]);

  // Memoriza el rango de tiempo (inicio y fin) segun el selector ('Week', 'Month', 'Year').
  // Se recalcula unicamente cuando cambia la variable de estado 'periodo'.
  const rangoVigente = useMemo(() => {
    const ahora = new Date();
    let inicio = new Date();

    if (periodo === 'Week') {
      inicio.setDate(ahora.getDate() - 7);
    } else if (periodo === 'Month') {
      inicio.setDate(ahora.getDate() - 31);
    } else {
      inicio.setFullYear(ahora.getFullYear() - 1);
    }
    return { inicio, fin: ahora };
  }, [periodo]);


  // Descarta cualquier registro (feed) cuya fecha este fuera del 'rangoVigente'.
  const feedsEnRangoVigente = useMemo(() => {
    
    if (periodo === 'Week') return datosReales;
    return datosReales.filter(feed => {
      const fecha = new Date(feed.fechaISO);
      return fecha >= rangoVigente.inicio && fecha < rangoVigente.fin;
    });
  }, [datosReales, rangoVigente]);

  // Procesa las lecturas filtradas y las agrupa en casilleros unicos (Dias, Semanas o Meses)
  const datosFiltradosYAgrupados = useMemo(() => {
    const diasNombres = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const mesesNombres = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const acumuladores = {};

    feedsEnRangoVigente.forEach(feed => {
      const fecha = new Date(feed.fechaISO);

      let llave = "";
      let orden = 0;

      if (periodo === 'Week') {
        // Agrupa por dia calendario de la semana (ej: "Mon 10", "Tue 11")
        const diaSemanaIndex = fecha.getDay(); // 0=Dom ... 6=Sáb
        llave = `${diasNombres[diaSemanaIndex]} ${fecha.getDate()}`;
        orden = diaSemanaIndex === 0 ? 6 : diaSemanaIndex - 1; // Lunes primero
      } else if (periodo === 'Month') {
        // Agrupa en bloques de 7 días naturales dentro del mes (Week 1 a Week 4)
        const numeroSemana = Math.ceil(fecha.getDate() / 7);
        llave = `Week ${numeroSemana}`;
        orden = numeroSemana;
      } else {
        // Un grupo por cada mes del año
        llave = mesesNombres[fecha.getMonth()];
        orden = fecha.getMonth();
      }

      // Si el grupo no existe en el acumulador, se inicializa en cero
      if (!acumuladores[llave]) {
        acumuladores[llave] = {
          label: llave, orden,
          Temperatura: 0, Humedad: 0, Ruido: 0, Luminosidad: 0, PM10: 0, PM25: 0, PM100: 0, cuenta: 0
        };
      }

      // Suma acumulativa de las variables medidas por los sensores
      const grupo = acumuladores[llave];
      grupo.Temperatura += feed.Temperatura;
      grupo.Humedad += feed.Humedad;
      grupo.Ruido += feed.Ruido;
      grupo.Luminosidad += feed.Luminosidad;
      grupo.PM10 += feed.PM10;
      grupo.PM25 += feed.PM25;
      grupo.PM100 += feed.PM100;
      grupo.cuenta++;
    });

    // Convierte el objeto acumulador a una lista, la ordena cronologicamente
    // y divide cada suma entre la 'cuenta' para obtener el PROMEDIO REAL de cada periodo.
    return Object.values(acumuladores)
      .sort((a, b) => a.orden - b.orden)
      .map(grupo => ({
        label: grupo.label,
        Temperatura: grupo.Temperatura / grupo.cuenta,
        Humedad: grupo.Humedad / grupo.cuenta,
        Ruido: grupo.Ruido / grupo.cuenta,
        Luminosidad: grupo.Luminosidad / grupo.cuenta,
        PM10: grupo.PM10 / grupo.cuenta,
        PM25: grupo.PM25 / grupo.cuenta,
        PM100: grupo.PM100 / grupo.cuenta
      }));
  }, [feedsEnRangoVigente, periodo]);  

  // Traduce cada etiqueta que ve el usuario (inglés) a la llave real con la que se guardan los datos agrupados (español)
  const claveGraficaActiva = useMemo(() => {
    return CLAVE_INTERNA[variable] || 'Temperatura';
  }, [variable, CLAVE_INTERNA]);

  // Configuración de paletas de color
  const configColores = {
    Temperature: { stroke: "#f97316", fill: "url(#histTemp)" },
    Humidity: { stroke: "#38bdf8", fill: "url(#histHum)" },
    Noise: { stroke: "#818cf8", fill: "url(#histRuido)" },
    Brightness: { stroke: "#fbbf24", fill: "url(#histLux)" },
    "PM1.0": { stroke: "#10b981", fill: "url(#histPM1)" },
    "PM2.5": { stroke: "#14b8a6", fill: "url(#histPM25)" },
    PM10: { stroke: "#06b6d4", fill: "url(#histPM10)" },
  };



  // CALCULO DE METRICAS (Promedio, Maximo, Minimo)
  const metricasCalculadas = useMemo(() => {
    if (datosFiltradosYAgrupados.length === 0) return { promedio: 0, max: 0, min: 0, unidad: "-" };

    //const claveDatos = CLAVE_INTERNA[variable] || variable;

    const valores = datosFiltradosYAgrupados.map(d => d[claveGraficaActiva]).filter(v => !isNaN(v));

    if (valores.length === 0) return { promedio: 0, max: 0, min: 0, unidad: "-" };

    const max = Math.max(...valores);
    const min = Math.min(...valores);
    const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
    
    let unidad = "µg/m³";
    if (variable === 'Temperature') unidad = "°C";
    if (variable === 'Humidity') unidad = "%";
    if (variable === 'Noise') unidad = "dB";
    if (variable === 'Brightness') unidad = "lux";

    return { promedio, max, min, unidad };
  }, [datosReales, variable]);

  const dataKeyGrafica = useMemo(() => {
    if (variable === "PM1.0") return "PM10";
    if (variable === "PM2.5") return "PM25";
    if (variable === "PM10") return "PM100";
    return variable;
  }, [variable]);

 return (
    <div className="w-full space-y-6">
      
      {/* CONTROLES SUPERIORES */}
      <div className="bg-[#0d1527] border border-slate-800/80 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 tracking-wide">Historical record</h3>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-semibold">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80">
              {['Week', 'Month', 'Year'].map((t) => (
                <button key={t} onClick={() => setPeriodo(t)} className={`px-4 py-1.5 rounded-lg transition-all ${periodo === t ? 'bg-[#1e293b] text-white' : 'text-slate-500 hover:text-slate-300'}`}>{t}</button>
              ))}
            </div>

            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80">
              <button onClick={() => setTipoGrafica('Area')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all ${tipoGrafica === 'Area' ? 'bg-[#1e293b] text-white' : 'text-slate-500 hover:text-slate-300'}`}><Layers className="w-3.5 h-3.5" /> Área</button>
              <button onClick={() => setTipoGrafica('Columns')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all ${tipoGrafica === 'Columns' ? 'bg-[#1e293b] text-white' : 'text-slate-500 hover:text-slate-300'}`}><BarChart2 className="w-3.5 h-3.5" /> Columns</button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] font-bold border-t border-slate-800/40 pt-4 select-none">
          {['Temperature', 'Humidity', 'Noise', 'Brightness', 'PM1.0', 'PM2.5', 'PM10'].map((v) => (
            <button key={v} onClick={() => setVariable(v)} className={`px-3 py-1.5 rounded-full border transition-all duration-150 cursor-pointer ${variable === v ? 'bg-orange-500/10 border-orange-500/40 text-orange-400 font-bold' : 'bg-slate-950 border-slate-800/60 text-slate-500 hover:text-slate-300'}`}>● {v}</button>
          ))}
        </div>
      </div>

      {/* AVISO DE PANTALLA DE CARGA */}
      {cargando ? (
        <div className="bg-[#0d1527] border border-slate-800/60 rounded-xl p-12 text-center text-slate-400 font-medium text-sm animate-pulse">
           Synchronizing analytical history with the ThingSpeak database...
        </div>
      ) : (
        <>
          {/*  KPI DE CALCULO DE MiNIMOS Y MAXIMOS */}
          <div className="bg-[#0d1527] border border-slate-800/80 rounded-xl p-5">
            <span className="text-[10px] font-bold tracking-widest text-orange-400 uppercase font-mono">{periodo} — {variable}</span>
            <div className="grid grid-cols-3 gap-6 mt-3 text-center md:text-left">
              <div className="border-r border-slate-800/60">
                <p className="text-[10px] font-semibold text-slate-500">Average</p>
                <h4 className="text-xl font-bold font-mono text-slate-200 mt-1">{metricasCalculadas.promedio.toFixed(1)} <span className="text-xs font-normal text-slate-400">{metricasCalculadas.unidad}</span></h4>
              </div>
              <div className="border-r border-slate-800/60 pl-2">
                <p className="text-[10px] font-semibold text-slate-500">Maximum</p>
                <h4 className="text-xl font-bold font-mono text-blue-400 mt-1">{metricasCalculadas.max.toFixed(1)} <span className="text-xs font-normal text-slate-400">{metricasCalculadas.unidad}</span></h4>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-500">Minimum</p>
                <h4 className="text-xl font-bold font-mono text-sky-400 mt-1">{metricasCalculadas.min.toFixed(1)} <span className="text-xs font-normal text-slate-400">{metricasCalculadas.unidad}</span></h4>
              </div>
            </div>
          </div>

          {/* GRAFICA REAL DE TENDENCIAS ACCIONABLE */}
          <div className="bg-[#0d1527] border border-slate-800/80 rounded-xl p-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4"> Average {variable}</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {tipoGrafica === 'Area' ? (
                  <AreaChart data={datosFiltradosYAgrupados} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="histTemp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.15}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                      <linearGradient id="histHum" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#38bdf8" stopOpacity={0.15}/><stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/></linearGradient>
                      <linearGradient id="histRuido" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#818cf8" stopOpacity={0.15}/><stop offset="95%" stopColor="#818cf8" stopOpacity={0}/></linearGradient>
                      <linearGradient id="histLux" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fbbf24" stopOpacity={0.15}/><stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/></linearGradient>
                      <linearGradient id="histPM1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                      <linearGradient id="histPM25" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#14b8a6" stopOpacity={0.15}/><stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/></linearGradient>
                      <linearGradient id="histPM10" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="label" stroke="#475569" fontSize={11} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: '#070b14', borderColor: '#1e293b', color: '#fff', fontSize: '12px' }} />
                    <Area type="monotone" dataKey={claveGraficaActiva} stroke={configColores[variable]?.stroke || '#f97316'} strokeWidth={2.5} fillOpacity={1} fill={configColores[variable]?.fill || 'url(#histTemp)'} isAnimationActive={true} animationDuration={1200} />
                  </AreaChart>
                ) : (
                  <BarChart data={datosFiltradosYAgrupados} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="label" stroke="#475569" fontSize={11} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: '#070b14', borderColor: '#1e293b', color: '#fff', fontSize: '12px' }} />
                    <Bar dataKey={claveGraficaActiva} fill={configColores[variable]?.stroke || '#f97316'} radius={[4, 4, 0, 0]} maxBarSize={35} isAnimationActive={true} animationDuration={1200} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* TABLA DE LECTURAS HISTORICAS */}
          <div className="bg-[#0d1527] border border-slate-800/80 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-200 tracking-wide">Averages table</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs font-medium">
                <thead>
                  <tr className="text-slate-600 border-b border-slate-800/60">
                    <th className="py-3 font-semibold w-1/5">Period</th>
                    <th className="py-3 font-semibold text-center">Temperature</th>
                    <th className="py-3 font-semibold text-center">Humidity</th>
                    <th className="py-3 font-semibold text-center">Ruido</th>
                    <th className="py-3 font-semibold text-center">Brightness</th>
                    <th className="py-3 font-semibold text-center">PM<sub>1.0</sub></th>
                    <th className="py-3 font-semibold text-center">PM<sub>2.5</sub></th>
                    <th className="py-3 font-semibold text-center">PM<sub>10</sub></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30 text-slate-300 font-mono">
                  {datosFiltradosYAgrupados.map((row, index) => (
                    <tr key={index} className="hover:bg-slate-900/20 transition-colors">
                      <td className="py-3.5 font-bold text-slate-400 font-sans">{row.label}</td>
                      <td className="py-3 text-center"><span className="bg-slate-900/60 text-emerald-400 px-3 py-1 rounded border border-slate-800/80">{row.Temperatura.toFixed(1)}</span></td>
                      <td className="py-3 text-center"><span className="bg-slate-900/60 text-emerald-400 px-3 py-1 rounded border border-slate-800/80">{row.Humedad.toFixed(1)}</span></td>
                      <td className="py-3 text-center"><span className="bg-slate-900/60 text-amber-500 px-3 py-1 rounded border border-slate-800/80">{row.Ruido.toFixed(1)}</span></td>
                      <td className="py-3 text-center"><span className="bg-slate-900/60 text-emerald-400 px-3 py-1 rounded border border-slate-800/80">{row.Luminosidad.toFixed(0)}</span></td>
                      <td className="py-3 text-center"><span className="bg-slate-900/60 text-emerald-400 px-3 py-1 rounded border border-slate-800/80">{row.PM10.toFixed(1)}</span></td>
                      <td className="py-3 text-center"><span className="bg-slate-900/60 text-amber-500 px-3 py-1 rounded border border-slate-800/80">{row.PM25.toFixed(1)}</span></td>
                      <td className="py-3 text-center"><span className="bg-slate-900/60 text-emerald-400 px-3 py-1 rounded border border-slate-800/80">{row.PM100.toFixed(0)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

function numF(val) {
  return val !== undefined && val !== null ? val.toFixed(1) : "0.0";
}