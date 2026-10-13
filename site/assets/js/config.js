/*
 * Configuración del sitio.
 *
 * endpoint: script que recibe cada cita y la manda por correo (api/cita.php).
 *           El correo de destino se configura dentro de ese archivo PHP.
 */
window.RL_CONFIG = {
  endpoint: 'api/cita.php',
  thanksUrl: 'gracias/',
  timezone: 'America/Mexico_City',
  prices: {
    'Van o caja cerrada': { label: 'desde $8,000 MXN + IVA', amount: 8000 },
    'Pickup caja corta': { label: 'desde $9,000 MXN + IVA', amount: 9000 },
    'Pickup full size': { label: 'desde $10,000 MXN + IVA', amount: 10000 },
    'Flotilla (3+)': { label: 'Precio especial', amount: null, fleet: true }
  },
  // Horario de citas.
  slots: {
    weekday: ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30'],
    saturday: ['10:00', '11:30', '13:00']
  },
  daysAhead: 6
};
