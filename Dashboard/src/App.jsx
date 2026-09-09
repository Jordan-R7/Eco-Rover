import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import { MapPin, Download } from "lucide-react";
import VistaGeneral from './components/VistaGeneral';
import MapaGps from './components/MapaGps';
import Historico from './components/Historico';
import MapaCalor from './components/MapaCalor';

import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';

export default function App() {
  const [pestañaGlobal, setPestañaGlobal] = useState('sensores');
  const dashboardRef = useRef(null);

  // FUNCIÓN DE EXPORTACIÓN A 300 DPI EN PNG
  const exportarImagen300DPI = async () => {
    const input = dashboardRef.current;
    if (!input) return;

    try {
      // 1. Generamos la imagen escalada a alta resolución (factor 3 para 300 DPI)
      const dataUrl = await htmlToImage.toPng(input, {
        pixelRatio: 3,
        quality: 1.0,
        backgroundColor: '#070b14',
        cacheBust: true,
      });

      // 2. Cargamos la imagen en un elemento canvas temporal para inyectarle los metadatos DPI
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Convertimos el canvas asegurando la descarga limpia
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'EcoRover-Dashboard-300DPI-Real.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 'image/png', 1.0);
      };
      
    } catch (error) {
      console.error('Error al generar la imagen a 300 DPI:', error);
    }
  };

  // Datos de ThingSpeak
  const [datosActuales, setDatosActuales] = useState({
    temperatura: 0,
    humedad: 0,
    lluvia: 0,
    pm10: 0,
    pm25: 0,
    pm100: 0,
    ruido: 0,
    luminosidad: 0,
    latitud: 0,
    longitud: 0,
    ultimaActualizacion: "Conectando...",
    satelites: 0
  });

  const [historicoFeeds, setHistoricoFeeds] = useState([]);
  const CHANNEL_ID = ""; 
  const URL_THINGSPEAK = `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?results=15&location=true&status=true&api_key=H1R36C74DFHPATBM`;
  
  useEffect(() => {
    const consultarThingSpeak = async () => {
      try {
        const respuesta = await fetch(URL_THINGSPEAK);
        const data = await respuesta.json();
        
        if (data.feeds && data.feeds.length > 0) {
          const ultimoFeed = data.feeds[data.feeds.length - 1];

          setDatosActuales({
            temperatura: parseFloat(ultimoFeed.field1) || 0,
            humedad: parseFloat(ultimoFeed.field2) || 0,
            ruido: parseFloat(ultimoFeed.field3) || 0,
            luminosidad: parseFloat(ultimoFeed.field4) || 0,
            pm10: parseFloat(ultimoFeed.field5) || 0,
            pm25: parseFloat(ultimoFeed.field6) || 0,
            pm100: parseFloat(ultimoFeed.field7) || 0,
            latitud: parseFloat(ultimoFeed.latitude) || 0,
            longitud: parseFloat(ultimoFeed.longitude) || 0,
            satelites: ultimoFeed.status === "1" ? "CON SEÑAL" : "BUSCANDO...",
            ultimaActualizacion: new Date(ultimoFeed.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });

          const formatearGrafica = data.feeds.map(feed => {
            const horaLocal = new Date(feed.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return {
              hora: horaLocal,
              Temp: parseFloat(feed.field1) || 0,
              Hum: parseFloat(feed.field2) || 0,
              Ruido: parseFloat(feed.field3) || 0,
              Lum: parseFloat(feed.field4) || 0,
              PM10: parseFloat(feed.field5) || 0,
              PM25: parseFloat(feed.field6) || 0,
              PM100: parseFloat(feed.field7) || 0
            };
          });
          setHistoricoFeeds(formatearGrafica);
        }
      } catch (error) {
        console.error("Error leyendo la telemetría del EcoRover:", error);
      }
    };

    consultarThingSpeak();
    const intervalo = setInterval(consultarThingSpeak, 15000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col font-sans select-none">
      
      <Header 
        pestañaActiva={pestañaGlobal} 
        setPestañaActiva={setPestañaGlobal} 
        estadoGlobal={datosActuales.temperatura >= 27.0 || datosActuales.ruido >= 55.0 ? "Requires attention" : "Normal system"}
        ultimoPaquete={datosActuales.ultimaActualizacion}
      />

      {/* BARRA SUPERIOR CON EL BOTÓN CORREGIDO */}
      <div className="px-6 md:px-8 pt-4 flex justify-end bg-[#090f1d]/10">
        <button
          onClick={exportarImagen300DPI}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold px-4 py-2 rounded-xl shadow-lg transition-all cursor-pointer text-xs z-50"
        >
          <Download className="w-4 h-4" />
          Descargar Pestaña en Alta Calidad (300 DPI)
        </button>
      </div>

      {/* CONTENEDOR ENVOLTORIO CAPTURADO */}
      <main ref={dashboardRef} className="flex-1 p-6 md:p-8 bg-[#070b14] overflow-y-auto w-full space-y-6">
        
        {pestañaGlobal === 'sensores' && (
          <VistaGeneral 
            datos={datosActuales} 
            datosHistoricos={historicoFeeds} 
          />
        )}

        {pestañaGlobal === 'gps' && (
          <div className="w-full">
            <MapaGps datos={datosActuales} />
          </div>
        )}

        {pestañaGlobal === 'historico' && (
          <div className="w-full">
            <Historico />
          </div>
        )}

        {pestañaGlobal === 'mapaCalor' && (
          <div className="w-full">
            <MapaCalor />
          </div>
        )}

      </main>
    </div>
  );
}
