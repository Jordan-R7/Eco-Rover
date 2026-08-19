import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Compass, Navigation, MapPin } from 'lucide-react';

// Importamos los estilos de Leaflet para que se renderice correctamente
import 'leaflet/dist/leaflet.css';

// Reemplazamos los marcadores por defecto para usar un pin estilizado dinámico
const marcadorRoverIcono = new L.DivIcon({
  className: 'custom-div-icon',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-8 h-10 bg-sky-500/20 stroke-sky-400 rounded-full animate-ping"></div>
      <div class="w-4 h-4 bg-sky-400 border-2 border-[#0d1527] rounded-full shadow-lg"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

// Hace que el mapa "persiga" al EcoRover en tiempo real cada vez que se mueve
function CentrarMapa({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords[0] !== 0 && coords[1] !== 0) {
      map.setView(coords, map.getZoom());
    }
  }, [coords, map]);
  return null;
}

export default function MapaGps({ datos }) {
  // Historial de coordenadas [lat, lon] reales que va acumulando el NEO-6M
  const [historialRuta, setHistorialRuta] = useState([]);

  // Posicion actual del Rover (Si viene en 0 de la nube, usamos una por defecto)
  const posicionActual = (datos.latitud && datos.longitud && datos.latitud !== 0)
    ? [datos.latitud, datos.longitud]
    : [6.2451655, -75.5500811]; // Coordenadas del campus 

  // Escuchar las actualizaciones del GPS para añadir puntos a la línea de trayectoria
  useEffect(() => {
    if (datos.latitud && datos.longitud && datos.latitud !== 0) {
      setHistorialRuta(prev => {
        // Evitamos guardar duplicados si el carro está parado
        if (prev.length > 0 && prev[prev.length - 1][0] === datos.latitud && prev[prev.length - 1][1] === datos.longitud) {
          return prev;
        }
        return [...prev, [datos.latitud, datos.longitud]];
      });
    }
  }, [datos.latitud, datos.longitud]);

  return (
    <div className="w-full space-y-6">
      
      {/* TARJETAS SUPERIORES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <CardTelemetriaGps titulo="Latitude" valor={`${posicionActual[0].toFixed(6)}°N`} subtexto="NEO-6M Sensor Y-axis" colorTexto="text-sky-400" />
        <CardTelemetriaGps titulo="Length" valor={`${posicionActual[1].toFixed(6)}°W`} subtexto="NEO-6M X-Axis Sensor" colorTexto="text-sky-400" />
        
        <div className="bg-[#0d1527] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between h-24">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">GPS NEO-6M</span>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2 h-2 rounded-full ${datos.latitud !== 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="text-sm font-bold text-slate-200">{datos.latitud !== 0 ? 'ASSET' : 'NO SIGNAL'}</span>
          </div>
        </div>
      </div>

      {/* CONTENEDOR DEL MAPA REAL EN VIVO */}
      <div className="bg-[#080d19] border border-slate-800/80 rounded-xl p-4 relative h-187.5 w-full shadow-inner overflow-hidden">
        
        {/* Indicador flotante de modo de rastreo */}
        <div className="absolute top-6 right-6 bg-[#0d1527]/90 text-slate-200 border border-slate-800 font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg z-1000 backdrop-blur-sm">
          <Navigation className="w-3.5 h-3.5 text-sky-400 transform rotate-45 animate-pulse" />
          <span>Active real-time tracking</span>
        </div>
        
        
        {/* CONTENEDOR MAPA DE LEAFLET */}
        <MapContainer 
          center={posicionActual} 
          zoom={18} 
          className="w-full h-full rounded-lg"
          zoomControl={true}
        >
          {/* CAPA DE MAPA SATELITAL / OSCURO PROFESIONAL (CartoDB Dark Matter)*/}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {/* Mapa de imagen satelital real de la Tierra, descomentar la linea de abajo y comentar la de arriba */}
          {/* <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" /> */}

          {/* Dibuja la linea de trayectoria del carrito (Linea punteada azul) */}
          {historialRuta.length > 1 && (
            <Polyline 
              positions={historialRuta} 
              pathOptions={{ color: '#38bdf8', weight: 4, dashArray: '8, 6', opacity: 0.8 }} 
            />
          )}

          {/* Marcador dinamico en la posicion actual del Rover */}
          <Marker position={posicionActual} icon={marcadorRoverIcono} />

          {/* Controlador inteligente para centrar la camara del mapa automaticamente */}
          <CentrarMapa coords={posicionActual} />

        </MapContainer>

      </div>
    </div>
  );
}

function CardTelemetriaGps({ titulo, valor, subtexto, colorTexto }) {
  return (
    <div className="bg-[#0d1527] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between h-24 transition duration-150 hover:border-slate-700/60">
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{titulo}</span>
      <h4 className={`text-base font-bold font-mono tracking-tight mt-1 ${colorTexto}`}>
        {valueInterval(valor)}
      </h4>
      <p className="text-[10px] text-slate-500 font-medium">{subtexto}</p>
    </div>
  );
}

function valueInterval(val) {
  return val;
}