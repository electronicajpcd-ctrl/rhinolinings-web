/*
 * Configuración del sitio: precios del cotizador y horarios de citas.
 * Todos los precios son SIN IVA. El IVA (16%) solo se agrega si el cliente pide factura.
 *
 * endpoint: script que recibe cada cita y la manda por correo (api/cita.php).
 */
window.RL_CONFIG = {
  endpoint: 'api/cita.php',
  thanksUrl: 'gracias/',
  timezone: 'America/Mexico_City',

  quote: {
    ivaRate: 0.16,
    // Tratamiento de adherencia cuando la caja o las piezas son de plástico.
    plasticFee: 1500,
    // "Solo bordes": para cajas que ya traen recubrimiento de agencia (cualquier pickup).
    bordesOnlyPrice: 4000,
    vehicles: [
      {
        id: 'pickup-full', group: 'pickup', name: 'Pickup full size / caja americana',
        options: [
          { id: 'sin-bordes', name: 'Caja sin bordes', price: 11000 },
          { id: 'con-bordes', name: 'Caja con bordes', price: 11500 }
        ]
      },
      {
        id: 'pickup-estandar', group: 'pickup', name: 'Pickup estándar',
        options: [
          { id: 'sin-bordes', name: 'Caja sin bordes', price: 10000 },
          { id: 'con-bordes', name: 'Caja con bordes', price: 10500 }
        ]
      },
      {
        id: 'pickup-corta', group: 'pickup', name: 'Pickup caja corta',
        options: [
          { id: 'sin-bordes', name: 'Caja sin bordes', price: 9000 },
          { id: 'con-bordes', name: 'Caja con bordes', price: 9500 }
        ]
      },
      {
        id: 'van-larga', group: 'van', name: 'Van larga (caja cerrada)',
        options: [
          { id: 'piso', name: 'Solo piso', price: 9000 },
          { id: 'piso-salpicaderas', name: 'Piso + salpicaderas', detail: 'Incluye los cubre-llantas interiores', price: 9500 },
          { id: 'completa', name: 'Interior completo', detail: 'Piso, paredes y techo', price: 14000 }
        ]
      },
      {
        id: 'van-corta', group: 'van', name: 'Van corta (caja cerrada)',
        options: [
          { id: 'piso', name: 'Solo piso', price: 8000 },
          { id: 'piso-salpicaderas', name: 'Piso + salpicaderas', detail: 'Incluye los cubre-llantas interiores', price: 8500 },
          { id: 'completa', name: 'Interior completo', detail: 'Piso, paredes y techo', price: 12000 }
        ]
      },
      { id: 'flotilla', group: 'fleet', name: 'Flotilla (3 o más unidades)', fleet: true }
    ],
    // Se cotizan en el taller al ver el vehículo.
    extras: ['Estribos', 'Facias / defensas']
  },

  // Horario de citas.
  slots: {
    weekday: ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30'],
    saturday: ['10:00', '11:30', '13:00']
  },
  daysAhead: 6
};
