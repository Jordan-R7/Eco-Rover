import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import { MapPin } from "lucide-react";
import VistaGeneral from './components/VistaGeneral';
import MapaGps from './components/MapaGps';
import Historico from './components/Historico';
import MapaCalor from './components/MapaCalor';

export default function App() {
  
  const [pestañaGlobal, setPestañaGlobal] = useState('sensores');

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
  const CHANNEL_ID = "3421848"; 
  const URL_THINGSPEAK = `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?results=15&location=true&status=true&api_key=H1R36C74DFHPATBM`;
  
  useEffect(() => {
    const consultarThingSpeak = async () => {
      try {
        const respuesta = await fetch(URL_THINGSPEAK);
        const data = await respuesta.json();
        
        if (data.feeds && data.feeds.length > 0) {
          // Tomamos el último paquete de datos registrado por el ESP32
          const ultimoFeed = data.feeds[data.feeds.length - 1];

          // Actualizamos el estado general 
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

          // Modelamos el historial de los últimos 15 registros para la gráfica de tendencias
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

    // Primera ejecución
    consultarThingSpeak();

    // Ciclo de refresco automático cada 15 segundos 
    const intervalo = setInterval(consultarThingSpeak, 15000);

    // Limpieza de memoria al desmontar
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col font-sans select-none">
      
      <Header 
        pestañaActiva={pestañaGlobal} 
        setPestañaActiva={setPestañaGlobal} 
        estadoGlobal={datosActuales.temperatura >= 27.0 || datosActuales.ruido >= 55.0 ? "Requiere atención" : "Sistema Normal"}
        ultimoPaquete={datosActuales.ultimaActualizacion}
      />

      <main className="flex-1 p-6 md:p-8 bg-[#090f1d]/10 overflow-y-auto w-full">
        
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