import React from 'react';
import GridTarjetas from './vista-general/GridTarjetas';
import GraficaTendencia from './vista-general/GraficaTendencia';
import CalidadAire from './vista-general/CalidadAire';

export default function VistaGeneral({ datos, datosHistoricos, zonaNombre }) {
  return (
    <div className="w-full space-y-6">
  
      <GridTarjetas datos={datos} />

      <GraficaTendencia datosHistoricos={datosHistoricos} zonaNombre={zonaNombre} />

      <CalidadAire datos={datos} />
    </div>
  );
}