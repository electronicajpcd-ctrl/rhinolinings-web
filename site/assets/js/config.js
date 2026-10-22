/*
 * Configuración del sitio: precios del cotizador y horarios de citas.
 * Los precios se muestran como precio final (no se menciona IVA en el sitio).
 *
 * endpoint: script que recibe cada cita y la manda por correo (api/cita.php).
 */
window.RL_CONFIG = {
  endpoint: 'api/cita.php',
  thanksUrl: 'gracias/',
  timezone: 'America/Mexico_City',

  quote: {
    // Promoción: se muestra sola entre start y end (hora de Guadalajara) y desaparece al terminar.
    // Aplica si la cita es antes de end. Para quitarla antes: active: false.
    promo: {
      active: true,
      name: 'Promoción de octubre',
      percent: 10,
      start: '2026-10-01T00:00:00-06:00',
      end: '2026-11-01T00:00:00-06:00',
      lastDayText: '31 de octubre'
    },
    // Tratamiento de adherencia cuando la caja o las piezas son de plástico.
    plasticFee: 1500,
    // "Solo bordes": para cajas que ya traen recubrimiento de agencia (cualquier pickup).
    bordesOnlyPrice: 4000,
    vehicles: [
      {
        id: 'pickup-full', group: 'pickup', name: 'Pickup full size / caja americana',
        examples: 'Ej. Lobo, Silverado, RAM 1500, Tundra, Sierra',
        models: ['Ford Lobo', 'Ford F-150', 'Ford F-150 Raptor', 'Ford F-150 Lightning', 'Ford F-250 Super Duty', 'Ford F-350 Super Duty', 'Chevrolet Silverado', 'Chevrolet Silverado 2500 HD', 'Chevrolet Silverado 3500 HD', 'Chevrolet Cheyenne', 'Chevrolet Avalanche', 'GMC Sierra', 'GMC Sierra Denali', 'GMC Sierra HD', 'RAM 1500', 'RAM 2500', 'RAM 3500', 'Dodge RAM', 'Toyota Tundra', 'Nissan Titan', 'Nissan Titan XD'],
        options: [
          { id: 'sin-bordes', name: 'Caja sin bordes', price: 11000 },
          { id: 'con-bordes', name: 'Caja con bordes', price: 11500 }
        ]
      },
      {
        id: 'pickup-estandar', group: 'pickup', name: 'Pickup estándar',
        examples: 'Ej. NP300, Hilux, L200 de cabina sencilla',
        models: ['Nissan NP300 cabina sencilla (estaquitas)', 'Toyota Hilux cabina sencilla', 'Mitsubishi L200 cabina sencilla', 'Chevrolet S10 cabina sencilla', 'Chevrolet S10 Max cabina sencilla', 'Ford Ranger cabina sencilla', 'Isuzu D-Max cabina sencilla', 'JAC T6 cabina sencilla', 'Foton Tunland cabina sencilla', 'Great Wall Wingle cabina sencilla'],
        options: [
          { id: 'sin-bordes', name: 'Caja sin bordes', price: 10000 },
          { id: 'con-bordes', name: 'Caja con bordes', price: 10500 }
        ]
      },
      {
        id: 'pickup-corta', group: 'pickup', name: 'Pickup caja corta',
        examples: 'Ej. Hilux, Tacoma, NP300, Ranger de doble cabina',
        models: ['Toyota Hilux doble cabina', 'Toyota Hilux GR Sport', 'Toyota Tacoma', 'Nissan NP300 doble cabina', 'Nissan Frontier', 'Nissan Navara', 'Ford Ranger doble cabina', 'Ford Ranger Raptor', 'Mitsubishi L200 doble cabina', 'Chevrolet Colorado', 'Chevrolet S10 doble cabina', 'Chevrolet S10 Max doble cabina', 'Mazda BT-50', 'Volkswagen Amarok', 'Isuzu D-Max doble cabina', 'Jeep Gladiator', 'Dodge Dakota', 'JAC T6 doble cabina', 'JAC T8 (Frison)', 'JAC T9', 'GWM Poer', 'GWM Cannon', 'Great Wall Wingle doble cabina', 'Foton Tunland doble cabina', 'Changan Hunter', 'Peugeot Landtrek', 'Kia Tasman', 'Ford Maverick', 'Hyundai Santa Cruz', 'Renault Oroch', 'RAM 700', 'Chevrolet Tornado', 'Fiat Strada', 'Volkswagen Saveiro (Saverio)', 'Ford Courier'],
        options: [
          { id: 'sin-bordes', name: 'Caja sin bordes', price: 9000 },
          { id: 'con-bordes', name: 'Caja con bordes', price: 9500 }
        ]
      },
      {
        id: 'van-larga', group: 'van', name: 'Van larga (caja cerrada)',
        examples: 'Ej. Sprinter, Transit, Promaster larga',
        models: ['Mercedes-Benz Sprinter larga', 'Mercedes-Benz Sprinter extra larga', 'Ford Transit larga', 'RAM Promaster larga', 'Nissan Urvan (NV350)', 'Toyota Hiace', 'Peugeot Boxer', 'Peugeot Manager', 'Fiat Ducato', 'Renault Master', 'Volkswagen Crafter', 'Iveco Daily', 'JAC Sunray', 'Foton View', 'Chevrolet Express extendida', 'Ford Econoline extendida'],
        options: [
          { id: 'piso', name: 'Solo piso', price: 9000 },
          { id: 'piso-salpicaderas', name: 'Piso + salpicaderas', detail: 'Incluye los cubre-llantas interiores', price: 9500 },
          { id: 'completa', name: 'Interior completo', detail: 'Piso, paredes y techo', price: 14000 }
        ]
      },
      {
        id: 'van-corta', group: 'van', name: 'Van corta (caja cerrada)',
        examples: 'Ej. Sprinter, Transit, Promaster corta, Partner',
        models: ['Mercedes-Benz Sprinter corta', 'Ford Transit corta', 'RAM Promaster corta', 'Chevrolet Express', 'Ford Econoline', 'Ford Transit Connect', 'RAM Promaster Rapid', 'Peugeot Partner', 'Peugeot Expert', 'Citroën Berlingo', 'Renault Kangoo', 'Renault Trafic', 'Nissan NV200', 'Volkswagen Caddy', 'Volkswagen Transporter', 'Chevrolet Tornado Van', 'Hyundai H1 / Staria Cargo'],
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
