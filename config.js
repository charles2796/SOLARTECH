// ============================================================
// Solartech — configuración del sitio
// Este es el archivo que se edita para cambiar precios y datos.
// ============================================================
window.SOLARTECH = {
  // Número de WhatsApp que recibe las cotizaciones: 57 + celular, sin espacios.
  // Ejemplo: '573001234567'. Mientras esté vacío, los botones de WhatsApp llevan al cotizador.
  whatsapp: '',

  // Garantías que se muestran en la página y en la cotización
  garantias: {
    mantenimientoAnios: 1,   // Mantenimiento gratis
    panelesAnios: 20,        // Garantía del fabricante de los paneles
    panelesRendimiento: 90,  // % de rendimiento que garantiza el fabricante
    bateriasAnios: 10,       // Garantía del fabricante de las baterías
    bateriasPerdida: 30      // % máximo de pérdida de capacidad que cubre la garantía
  },

  // Dirección de la aplicación web de Google Apps Script que guarda los datos
  // en Google Sheets. Déjala vacía ('') para no guardar. Ver README.md.
  guardarEn: '',

  // Base de datos de precios y consumos del cotizador
  db: {
    parametros: {
      tarifa: 950,          // Valor del kWh en COP cuando el cliente no da su factura
      hsp: 4.5,             // Horas solares pico (Arauca / Orinoquía)
      pr: 0.78,             // Rendimiento del sistema (pérdidas por calor, cableado, inversor)
      rangoMenos: 8,        // % por debajo del valor estimado
      rangoMas: 12,         // % por encima del valor estimado
      margen: 20,           // % por debajo del tope que debe consumir el cliente para que la factura llegue en $ 0
      ahorroSobreLimite: 95 // % de ahorro aproximado si el cliente pasa el límite (sistema sin baterías)
    },
    equipos: {
      panelW: 580, panelPrecio: 560000, panelArea: 2.6,
      inversorRedKW: 700000, inversorHibridoKW: 1300000,
      bateriaKWh: 5.12, bateriaPrecio: 6200000, bateriaDoD: 90,
      estructuraPanel: 190000, materialPct: 12,
      manoObraKWp: 450000, instalacionBateria: 300000,
      ingenieria: 800000, legalizacion: 2000000
    },
    electrodomesticos: [
      { id: 'nevera', nombre: 'Nevera', w: 150, h: 10 },
      { id: 'congelador', nombre: 'Congelador', w: 200, h: 10 },
      { id: 'aa12', nombre: 'Aire acondicionado 12.000 BTU', w: 1100, h: 8 },
      { id: 'aa18', nombre: 'Aire acondicionado 18.000 BTU', w: 1600, h: 8 },
      { id: 'ventilador', nombre: 'Ventilador', w: 60, h: 8 },
      { id: 'tv', nombre: 'Televisor', w: 100, h: 5 },
      { id: 'bombillo', nombre: 'Bombillo LED', w: 9, h: 5 },
      { id: 'lavadora', nombre: 'Lavadora', w: 500, h: 1 },
      { id: 'plancha', nombre: 'Plancha de ropa', w: 1200, h: 0.5 },
      { id: 'ducha', nombre: 'Ducha eléctrica', w: 3500, h: 0.25 },
      { id: 'microondas', nombre: 'Horno microondas', w: 1200, h: 0.25 },
      { id: 'licuadora', nombre: 'Licuadora', w: 400, h: 0.25 },
      { id: 'arrocera', nombre: 'Olla arrocera', w: 700, h: 0.5 },
      { id: 'portatil', nombre: 'Computador portátil', w: 65, h: 6 },
      { id: 'pc', nombre: 'Computador de escritorio', w: 200, h: 8 },
      { id: 'router', nombre: 'Router de internet', w: 12, h: 24 },
      { id: 'celular', nombre: 'Cargador de celular', w: 10, h: 3 },
      { id: 'camaras', nombre: 'Cámara de seguridad', w: 10, h: 24 },
      { id: 'bomba', nombre: 'Bomba de agua', w: 750, h: 1 }
    ]
  }
};
