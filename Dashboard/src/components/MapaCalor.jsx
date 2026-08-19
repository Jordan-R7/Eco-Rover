import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { Thermometer, Droplets, Volume2, Sun, Wind, Clock, CalendarDays } from 'lucide-react';

const CHANNEL_ID = "3421848";
const API_KEY = "H1R36C74DFHPATBM";

// Configuracion de cada variable
// Los rangos son ajustables segun lo que normalmente mida el sensor.
const CONFIG_VARIABLES = {
  Temperature: { campo: 'Temperatura', unidad: '°C', min: 15, max: 35, icono: Thermometer },
  Humidity: { campo: 'Humedad', unidad: '%', min: 20, max: 100, icono: Droplets },
  Noise: { campo: 'Ruido', unidad: 'dB', min: 30, max: 90, icono: Volume2 },
  Brightness: { campo: 'Luminosidad', unidad: 'lux', min: 0, max: 1000, icono: Sun },
  'PM1.0': { campo: 'PM10', unidad: 'µg/m³', min: 0, max: 50, icono: Wind },
  'PM2.5': { campo: 'PM25', unidad: 'µg/m³', min: 0, max: 75, icono: Wind },
  PM10: { campo: 'PM100', unidad: 'µg/m³', min: 0, max: 100, icono: Wind },
};

// Paleta de colores azul -> verde -> amarillo -> naranja -> rojo de un mapa de calor climatico
const GRADIENTE_CALOR = { 0.0: '#2563eb', 0.25: '#14b8a6', 0.5: '#eab308', 0.75: '#f97316', 1.0: '#dc2626' };
const GRADIENTE_CSS = 'linear-gradient(90deg, #2563eb, #14b8a6, #eab308, #f97316, #dc2626)';

// Genera una ruta de ejemplo con
// valores de sensores simulados, para poder probar el mapa mientras aun no hay
// mediciones reales del carrito. No se usa cuando ya hay datos reales del canal.
function generarDatosDemo(fechaBase) {
  const puntos = [];
  const totalPuntos = 140;

  // Puntos de referencia (waypoints) que definen el recorrido. Cada tramo
  // entre dos waypoints es una línea recta; el conjunto simula un trayecto
  // real con un par de cambios de dirección, no un círculo ni una espiral.
  const waypoints = [
    { lat: 6.2449132, lon: -75.5507540 }, // punto de partida
    { lat: 6.2456247, lon: -75.5503225 }, // tramo recto hacia el noreste
    { lat: 6.24499325, lon: -75.5503352 }, // giro suave, sigue hacia el este
    { lat: 6.2449, lon: -75.5512703 }, // giro de regreso hacia el sureste
  ];

  // Longitud de cada tramo, para repartir los puntos de forma proporcional
  // a la distancia real recorrida (no a la misma cantidad de puntos por tramo)
  const distanciasTramos = [];
  let distanciaTotal = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = Math.hypot(
      waypoints[i + 1].lat - waypoints[i].lat,
      waypoints[i + 1].lon - waypoints[i].lon
    );
    distanciasTramos.push(d);
    distanciaTotal += d;
  }

  for (let i = 0; i < totalPuntos; i++) {
    const progreso = i / (totalPuntos - 1); // 0 a 1 a lo largo de todo el recorrido
    let distanciaObjetivo = progreso * distanciaTotal;

    // Ubicamos en qué tramo cae este punto, según la distancia acumulada
    let tramoIndex = 0;
    let acumulado = 0;
    for (let t = 0; t < distanciasTramos.length; t++) {
      if (distanciaObjetivo <= acumulado + distanciasTramos[t] || t === distanciasTramos.length - 1) {
        tramoIndex = t;
        break;
      }
      acumulado += distanciasTramos[t];
    }

    const largoTramo = distanciasTramos[tramoIndex] || 1;
    const fraccionTramo = (distanciaObjetivo - acumulado) / largoTramo;
    const a = waypoints[tramoIndex];
    const b = waypoints[tramoIndex + 1];

    // Ruido aleatorio muy sutil (unos pocos metros), como la imprecisión
    // normal de un GPS real, para que no se vea una línea perfectamente recta
    const ruidoLat = (Math.random() - 0.5) * 0.00004;
    const ruidoLon = (Math.random() - 0.5) * 0.00004;

    const lat = a.lat + (b.lat - a.lat) * fraccionTramo + ruidoLat;
    const lon = a.lon + (b.lon - a.lon) * fraccionTramo + ruidoLon;

    // Repartimos los puntos entre las 06:00 y las 19:00 del dia elegido
    const horaDecimal = 6 + progreso * 13;
    const horas = Math.floor(horaDecimal);
    const minutos = Math.floor((horaDecimal - horas) * 60);
    const fechaISO = `${fechaBase}T${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:00`;

    // Los valores varían con la hora del día (más luz/calor al mediodía) y con
    // el avance del recorrido (para simular zonas con más o menos partículas/ruido)
    const factorHora = Math.sin(((horaDecimal - 6) / 13) * Math.PI); // 0 al amanecer/atardecer, 1 al mediodía
    const factorTramo = Math.sin(progreso * Math.PI * 2.3);

    puntos.push({
      fechaISO,
      lat,
      lon,
      Temperatura: 22 + factorHora * 8 + factorTramo * 2,
      Humedad: 75 - factorHora * 25 + factorTramo * 5,
      Ruido: 45 + Math.abs(factorTramo) * 25 + factorHora * 10,
      Luminosidad: 50 + factorHora * 750,
      PM10: 8 + Math.max(0, factorTramo) * 20,
      PM25: 12 + Math.max(0, factorTramo) * 30,
      PM100: 25 + Math.max(0, factorTramo) * 50,
    });
  }

  return puntos;
}

// Interpola un color dentro del mismo degradado del mapa de calor, segun la
// intensidad (0-1) de un valor. Asi el anillo de la burbuja de seleccion
// coincide visualmente con el color que se ve en esa zona del mapa.
function interpolarColorGradiente(intensidad) {
  const paradas = [
    { pos: 0.0, color: [37, 99, 235] },   // #2563eb azul
    { pos: 0.25, color: [20, 184, 166] }, // #14b8a6 verde-azulado
    { pos: 0.5, color: [234, 179, 8] },   // #eab308 amarillo
    { pos: 0.75, color: [249, 115, 22] }, // #f97316 naranja
    { pos: 1.0, color: [220, 38, 38] },   // #dc2626 rojo
  ];
  const t = Math.max(0, Math.min(1, intensidad));
  let a = paradas[0], b = paradas[paradas.length - 1];
  for (let i = 0; i < paradas.length - 1; i++) {
    if (t >= paradas[i].pos && t <= paradas[i + 1].pos) {
      a = paradas[i];
      b = paradas[i + 1];
      break;
    }
  }
  const rango = (b.pos - a.pos) || 1;
  const f = (t - a.pos) / rango;
  const r = Math.round(a.color[0] + (b.color[0] - a.color[0]) * f);
  const g = Math.round(a.color[1] + (b.color[1] - a.color[1]) * f);
  const bch = Math.round(a.color[2] + (b.color[2] - a.color[2]) * f);
  return `rgb(${r}, ${g}, ${bch})`;
}

// Distancia en metros entre dos coordenadas (formula haversine)
function distanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Escucha los clics sobre el mapa y busca la lectura real mas cercana al punto tocado
function SelectorDePunto({ datosEnVentana, onSeleccion }) {
  useMapEvents({
    click(e) {
      if (datosEnVentana.length === 0) {
        onSeleccion(null);
        return;
      }
      let masCercano = null;
      let distanciaMin = Infinity;
      datosEnVentana.forEach(d => {
        const dist = distanciaMetros(e.latlng.lat, e.latlng.lng, d.lat, d.lon);
        if (dist < distanciaMin) {
          distanciaMin = dist;
          masCercano = d;
        }
      });
      // Solo mostramos la burbuja si el clic cayo razonablemente cerca de un
      // tramo real del recorrido (para no mostrar datos donde el carrito no paso)
      if (masCercano && distanciaMin < 120) {
        onSeleccion(masCercano);
      } else {
        onSeleccion(null);
      }
    }
  });
  return null;
}

// Burbuja estilo: valor grande de la variable elegida, con el
// rango real (min/max) del dia
function MarcadorSeleccion({ punto, cfg, variableNombre, extremos }) {
  if (!punto) return null;

  const valor = punto[cfg.campo];
  const intensidad = Math.max(0, Math.min(1, (valor - cfg.min) / (cfg.max - cfg.min)));
  const colorAnillo = interpolarColorGradiente(intensidad);
  const valorRedondeado = Math.round(valor * 10) / 10;
  const sufijo = cfg.unidad === '°C' ? '°' : '';
  const horaLectura = new Date(punto.fechaISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const iconoHtml = `
    <div style="display:flex; flex-direction:column; align-items:center; font-family:sans-serif;">
      <div style="
        width:76px; height:76px; border-radius:9999px;
        background:#0d1527; border:4px solid ${colorAnillo};
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        box-shadow:0 8px 24px rgba(0,0,0,0.55);
      ">
        <span style="color:#f1f5f9; font-weight:800; font-size:19px; line-height:1;">${valorRedondeado}${sufijo}</span>
        <span style="color:${colorAnillo}; font-weight:700; font-size:9px; margin-top:3px; letter-spacing:0.5px;">${extremos.min.toFixed(0)} — ${extremos.max.toFixed(0)}</span>
      </div>
      <div style="width:2px; height:12px; background:${colorAnillo};"></div>
      <div style="width:9px; height:9px; border-radius:9999px; background:${colorAnillo}; box-shadow:0 0 0 3px rgba(255,255,255,0.12); margin-top:-2px;"></div>
    </div>
  `;

  const icono = L.divIcon({
    className: '',
    html: iconoHtml,
    iconSize: [80, 100],
    iconAnchor: [40, 100],
    popupAnchor: [0, -100],
  });

  return (
    <Marker position={[punto.lat, punto.lon]} icon={icono}>
      <Popup>
        <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
          <strong>{variableNombre}:</strong> {valorRedondeado} {cfg.unidad}<br />
          Hora de la lectura: {horaLectura}
        </div>
      </Popup>
    </Marker>
  );
}

function CapaMapaCalor({ puntos }) {
  const map = useMap();
  const capaRef = useRef(null);

  useEffect(() => {
    if (capaRef.current) {
      map.removeLayer(capaRef.current);
      capaRef.current = null;
    }
    if (puntos.length > 0) {
      capaRef.current = L.heatLayer(puntos, {
        radius: 32,
        blur: 22,
        maxZoom: 19,
        max: 1,
        gradient: GRADIENTE_CALOR
      }).addTo(map);
    }
    return () => {
      if (capaRef.current) {
        map.removeLayer(capaRef.current);
        capaRef.current = null;
      }
    };
  }, [puntos, map]);

  return null;
}

// Centra y ajusta el zoom automaticamente al tramo de ruta filtrado
function AjustarVista({ puntos }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length > 0) {
      const bounds = L.latLngBounds(puntos.map(p => [p[0], p[1]]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }
  }, [puntos, map]);
  return null;
}

export default function MapaCalor() {
  // Variable que se esta visualizando en el mapa de calor
  const [variable, setVariable] = useState('Temperature');

  // Filtro de fecha y horario el cual el usuario controla
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [horaInicio, setHoraInicio] = useState('00:00');
  const [horaFin, setHoraFin] = useState(() => {
    const ahora = new Date();
    return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  });

  const [datosReales, setDatosReales] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [modoDemo, setModoDemo] = useState(false);
  const [diagnostico, setDiagnostico] = useState({ crudas: 0, conGps: 0 });
  const [puntoSeleccionado, setPuntoSeleccionado] = useState(null);

  // Descargamos todas las lecturas del dia seleccionado, cada una con sus coordenadas GPS reales (lat/lon) reportada por el NEO-6M a ThingSpeak.
  useEffect(() => {
    const descargarRuta = async () => {
      setCargando(true);
      setError(null);
      try {
        const inicioParam = encodeURIComponent(`${fecha} 00:00:00`);
        const finParam = encodeURIComponent(`${fecha} 23:59:59`);
        const URL_API = `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?start=${inicioParam}&end=${finParam}&api_key=${API_KEY}`;

        const respuesta = await fetch(URL_API);
        if (!respuesta.ok) throw new Error(`Error del servidor: ${respuesta.status}`);
        const json = await respuesta.json();

        const feedsCrudos = json.feeds || [];

        const datosFormateados = (json.feeds || [])
          .filter(feed => feed.field1 !== null && feed.latitude && feed.longitude)
          .map(feed => ({
            fechaISO: feed.created_at,
            lat: parseFloat(feed.latitude),
            lon: parseFloat(feed.longitude),
            Temperatura: parseFloat(feed.field1) || 0,
            Humedad: parseFloat(feed.field2) || 0,
            Ruido: parseFloat(feed.field3) || 0,
            Luminosidad: parseFloat(feed.field4) || 0,
            PM10: parseFloat(feed.field5) || 0,   // pm1.0
            PM25: parseFloat(feed.field6) || 0,   // pm2.5
            PM100: parseFloat(feed.field7) || 0,  // pm10
          }))
          .filter(d => d.lat !== 0 && d.lon !== 0);

        console.log(`[MapaCalor] Lecturas descargadas de ThingSpeak para ${fecha}:`, feedsCrudos.length);

        if (feedsCrudos.length > 0) {
          console.log('[MapaCalor] Ejemplo de lectura cruda (primer feed):', feedsCrudos[0]);
        }
        console.log(`[MapaCalor] Lecturas con GPS válido (lat/lon != 0):`, datosFormateados.length);
 
        setDiagnostico({ crudas: feedsCrudos.length, conGps: datosFormateados.length });

        setDatosReales(datosFormateados);
      } catch (err) {
        console.error('Error al descargar la ruta térmica:', err);
        setError('No se pudo descargar la información del servidor.');
      } finally {
        setCargando(false);
      }
    };

    descargarRuta();

    // Refrescamos cada 60s para que, si el día seleccionado es hoy el recorrido reciente del carrito se vaya agregando solo al mapa.
    const intervalo = setInterval(descargarRuta, 60000);
    return () => clearInterval(intervalo);
  }, [fecha]);

  // Datos de ejemplo (solo se generan y se usan si el modo demo está activo)
  const datosDemo = useMemo(() => generarDatosDemo(fecha), [fecha]);
  const datosBase = modoDemo ? datosDemo : datosReales;

  // Filtramos por la ventana horaria elegida (ej. 8:00 am a 10:00 am)
  const datosEnVentana = useMemo(() => {
    const [hIni, mIni] = horaInicio.split(':').map(Number);
    const [hFin, mFin] = horaFin.split(':').map(Number);
    const minutosIni = hIni * 60 + mIni;
    const minutosFin = hFin * 60 + mFin;

    return datosBase.filter(d => {
      const fechaPunto = new Date(d.fechaISO);
      const minutosPunto = fechaPunto.getHours() * 60 + fechaPunto.getMinutes();
      return minutosPunto >= minutosIni && minutosPunto <= minutosFin;
    });
  }, [datosBase, horaInicio, horaFin]);

  // Rango real (minimo/maximo) de la variable elegida dentro de la ventana
  // horaria actual, para mostrarlo debajo del valor en la burbuja seleccionada
  const extremosVariable = useMemo(() => {
    const cfg = CONFIG_VARIABLES[variable];
    if (datosEnVentana.length === 0) return { min: cfg.min, max: cfg.max };
    const valores = datosEnVentana.map(d => d[cfg.campo]);
    return { min: Math.min(...valores), max: Math.max(...valores) };
  }, [datosEnVentana, variable]);

  // Si el usuario cambia de variable, fecha u hora, la burbuja anterior ya no
  // aplica, asi que la limpiamos
  useEffect(() => {
    setPuntoSeleccionado(null);
  }, [variable, fecha, horaInicio, horaFin, modoDemo]);

  // Convertimos las lecturas filtradas en puntos [lat, lon, intensidad 0-1] segun la variable elegida
  const puntosCalor = useMemo(() => {
    const cfg = CONFIG_VARIABLES[variable];
    return datosEnVentana.map(d => {
      const valor = d[cfg.campo];
      const intensidad = Math.max(0, Math.min(1, (valor - cfg.min) / (cfg.max - cfg.min)));
      return [d.lat, d.lon, intensidad];
    });
  }, [datosEnVentana, variable]);

  const cfgActual = CONFIG_VARIABLES[variable];
  const centroDefecto = [6.270526, -75.59156]; // Coordenadas del campus, solo como vista inicial

  return (
    <div className="w-full space-y-6">

      {/* CONTROLES SUPERIORES */}
      <div className="bg-[#0d1527] border border-slate-800/80 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 tracking-wide">Heat map </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800/80 rounded-xl px-3 py-2">
              <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="bg-transparent text-slate-200 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800/80 rounded-xl px-3 py-2">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="bg-transparent text-slate-200 outline-none"
              />
              <span className="text-slate-600">—</span>
              <input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="bg-transparent text-slate-200 outline-none"
              />
            </div>
            <button
              onClick={() => {
                setModoDemo(prev => {
                  const activando = !prev;
                  if (activando) {
                    setHoraInicio('06:00');
                    setHoraFin('19:00');
                  }
                  return activando;
                });
              }}
              className={`px-4 py-2 rounded-xl border transition-all ${modoDemo ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-slate-950 border-slate-800/80 text-slate-500 hover:text-slate-300'}`}
            >
              {modoDemo ? '● Active example data' : 'Use example data'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] font-bold border-t border-slate-800/40 pt-4 select-none">
          {Object.keys(CONFIG_VARIABLES).map((v) => (
            <button
              key={v}
              onClick={() => setVariable(v)}
              className={`px-3 py-1.5 rounded-full border transition-all duration-150 cursor-pointer ${variable === v ? 'bg-orange-500/10 border-orange-500/40 text-orange-400 font-bold' : 'bg-slate-950 border-slate-800/60 text-slate-500 hover:text-slate-300'}`}
            >
              ● {v}
            </button>
          ))}
        </div>
      </div>

      {/* MAPA CON LA CAPA DE CALOR */}
      <div className="bg-[#080d19] border border-slate-800/80 rounded-xl p-4 relative h-187.5 w-full shadow-inner overflow-hidden">

        {/* Escala de color */}
        <div className="absolute top-6 right-6 bg-[#0d1527]/90 border border-slate-800 rounded-xl px-4 py-3 z-1000 backdrop-blur-sm w-44 shadow-lg">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wide mb-2">{(CONFIG_VARIABLES[variable] || CONFIG_VARIABLES.Temperature)?.unidad || ''}</p>
          <div className="h-2 w-full rounded-full" style={{ background: GRADIENTE_CSS }} />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>{cfgActual.min}</span>
            <span>{cfgActual.max}</span>
          </div>
        </div>

        {/* Estado de carga */}
        {cargando && !modoDemo && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#080d19]/70 z-1000 text-slate-400 text-sm font-medium animate-pulse">
           Loading route for {fecha}...
          </div>
        )}

        {/* Aviso cuando no hay lecturas en la ventana horaria elegida */}
        {!cargando && puntosCalor.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#080d19]/70 z-1000 text-slate-500 text-sm font-medium text-center px-10">
            There are no rover readings between  {horaInicio} and {horaFin} for the {fecha}.
          </div>
        )}

        <MapContainer center={centroDefecto} zoom={16} className="w-full h-full rounded-lg" zoomControl={true}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          <CapaMapaCalor puntos={puntosCalor} />
          <AjustarVista puntos={puntosCalor} />
          <SelectorDePunto datosEnVentana={datosEnVentana} onSeleccion={setPuntoSeleccionado} />
          <MarcadorSeleccion
            punto={puntoSeleccionado}
            cfg={cfgActual}
            variableNombre={variable}
            extremos={extremosVariable}
          />
        </MapContainer>
      </div>

      {error && !modoDemo && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium rounded-xl p-4">
          {error}
        </div>
      )}
    </div>
  );
}