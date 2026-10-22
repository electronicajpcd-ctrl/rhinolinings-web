# rhinolinings.com.mx

Sitio de Rhino Linings Guadalajara: landing para campañas de Meta y Google con agendador de citas y página de gracias.

Es un sitio estático (HTML, CSS y JavaScript, sin WordPress ni base de datos). Todo lo que se publica está en la carpeta `site/`.

```
site/
  index.html            Landing
  gracias/index.html    Página de gracias (después de agendar)
  assets/css/           Estilos
  assets/js/config.js   Configuración: precios y horarios del agendador
  api/cita.php          Recibe cada cita y la envía por correo
  assets/js/main.js     Menú, animaciones y agendador
  assets/js/gracias.js  Resumen de la cita y botón de calendario
  assets/img/           Logo, fotos, favicon, imagen para compartir
  .htaccess             Caché, compresión y (opcional) forzar HTTPS
.github/workflows/deploy.yml   Publicación automática a Hostgator por FTP
```

---

## 1. Subdominio de prueba en Hostgator (una sola vez)

1. **cPanel → Dominios → Create A New Domain**: escribe `nuevo.rhinolinings.com.mx` (cPanel lo reconoce como subdominio de rhinolinings.com.mx; no se compra nada).
   **Desmarca** "Share document root" y deja como directorio `public_html/nuevo.rhinolinings.com.mx`. Anótalo.
2. **cPanel → SSL/TLS Status**: ejecuta AutoSSL para que el subdominio tenga https.
3. **cPanel → Cuentas FTP → Agregar cuenta FTP**
   - Usuario: `deploy-nuevo`
   - Directorio: **la carpeta del subdominio** del paso 1 (no `public_html`).
   - Como el hosting es compartido con otros sitios, esta cuenta solo puede ver y escribir esa carpeta. Si algo falla, no toca los demás sitios.
   - Anota el usuario completo (`deploy-nuevo@rhinolinings.com.mx`), la contraseña y el servidor FTP que muestra cPanel en "Configurar cliente FTP".

## 2. Repositorio en GitHub (una sola vez)

1. Crea un repositorio **privado**, por ejemplo `rhinolinings-web`.
2. Sube el contenido de esta carpeta:
   ```bash
   cd rhinolinings-web
   git init
   git add .
   git commit -m "Sitio nuevo Rhino Linings GDL"
   git branch -M main
   git remote add origin git@github.com:TU_USUARIO/rhinolinings-web.git
   git push -u origin main
   ```
3. En el repositorio: **Settings → Environments → New environment → `staging`**, y dentro agrega estos secretos:

   | Secreto | Valor |
   |---|---|
   | `FTP_SERVER` | Servidor FTP de cPanel (por ejemplo `ftp.rhinolinings.com.mx`) |
   | `FTP_USERNAME` | `deploy-nuevo@rhinolinings.com.mx` |
   | `FTP_PASSWORD` | La contraseña de esa cuenta |
   | `FTP_SERVER_DIR` | Opcional. Déjalo vacío: la cuenta ya entra directo a la carpeta del subdominio |

4. Haz cualquier push a `main` (o **Actions → Publicar en Hostgator → Run workflow → staging**). En 1–2 minutos el sitio aparece en `https://nuevo.rhinolinings.com.mx`.

En staging el workflow agrega `noindex` automáticamente, para que Google no indexe el sitio de prueba.

**Si la conexión falla con un error de TLS/certificado:** Settings → Secrets and variables → Actions → Variables → crea `FTP_PROTOCOL` con valor `ftp`.

## 3. Citas por correo

El correo de rhinolinings.com.mx está en **Titan** (MX `mx1.titan.email`). Por eso las citas se envían por **SMTP autenticado con la cuenta `citas@rhinolinings.com.mx` de Titan**: así pasan SPF/DKIM y no se pierden ni caen en spam.

1. En el panel de Titan (correo de Hostgator) crea la cuenta `citas@rhinolinings.com.mx`.
2. En GitHub, en el environment `staging` (y luego en `produccion`), agrega el secreto **`SMTP_PASSWORD`** con la contraseña de esa cuenta de Titan.
3. Vuelve a correr la publicación. El workflow genera `site/api/smtp-config.php` en el servidor con esos datos; ese archivo **no** está en el repositorio.
4. Agenda una cita de prueba: debe llegar a `contacto@rhinolinings.com.mx` con asunto "Nueva cita: …".

Opcionales (variables del environment): `SMTP_USER` (por defecto `citas@rhinolinings.com.mx`), `SMTP_HOST` (`smtp.titan.email`), `SMTP_PORT` (`465`).

Si no existe `SMTP_PASSWORD`, `cita.php` intenta con `mail()` del servidor. Para que ese respaldo funcione con Titan, en cPanel → **Enrutamiento de correo** de rhinolinings.com.mx elige **Intercambiador de correo remoto**.

Qué incluye el correo: nombre, WhatsApp con enlace directo para escribirle, vehículo y modelo, precio aceptado, día, hora, urgencia y el origen de la campaña (utm, o "Meta"/"Google Ads" si llega con fbclid/gclid).

**Respaldo:** cada cita también se guarda en `/home/USUARIO/citas-privadas/citas-rhinolinings.csv`, en la carpeta de la cuenta y fuera de `public_html`, así que no se puede abrir desde internet. Se descarga desde el Administrador de archivos de cPanel y se abre en Excel. Sirve si algún correo no llega.

**Anti-spam:** campo oculto para bots, rechazo de envíos hechos en menos de 3 segundos y máximo 5 citas por IP cada 10 minutos.

Si el envío falla, el cliente ve un aviso para intentar de nuevo o escribir por WhatsApp; no se le manda a la página de gracias sin que la cita se haya registrado.

> Más adelante, para pasar a GoHighLevel, basta con agregar en `cita.php` un envío al webhook de entrada de GHL; el formulario no cambia.

### Google Sheets (opcional)

Además del correo, cada cita puede agregarse como fila en una hoja de Google Sheets.

1. Sigue las instrucciones al inicio de `integraciones/google-sheets.gs` (se pega en Extensiones → Apps Script de la hoja y se publica como aplicación web).
2. En GitHub agrega los secretos `SHEETS_URL` (la URL `/exec`) y `SHEETS_TOKEN` (la clave que pusiste en el script).
3. Vuelve a publicar y haz una cita de prueba: debe aparecer una fila en la pestaña "Citas".

## 4. Píxel de Meta y Google Ads

- Pega el código base del **Píxel de Meta** y de la **etiqueta de Google** en el `<head>` de `site/index.html` y de `site/gracias/index.html` (hay un comentario que marca el lugar).
- El evento de conversión va **solo en `gracias/index.html`**: `fbq('track', 'Schedule')` (o `Lead`) para Meta, y la conversión de Google Ads. Así las campañas se optimizan por citas agendadas, no por clics.

## 5. Pasar a producción (rhinolinings.com.mx)

1. **Respaldo del WordPress actual:** cPanel → Copia de seguridad → descarga el respaldo de la carpeta de inicio y la base de datos del sitio.
2. **Saca el WordPress de la carpeta del dominio:** en el Administrador de archivos, mueve todo el contenido de la carpeta del dominio (ver *Dominios* en cPanel para saber cuál es) a una carpeta **fuera** de `public_html`, por ejemplo `/home/USUARIO/wp-respaldo-rhino/`. No la dejes dentro de `public_html`: quedaría visible en internet.
3. **Cuenta FTP de producción:** cPanel → Cuentas FTP → `deploy-prod@rhinolinings.com.mx`, con directorio = la carpeta del dominio.
4. **GitHub → Settings → Environments → New environment `produccion`** con los mismos secretos que `staging`: `FTP_SERVER` (sh00022.hostgator.mx), `FTP_USERNAME` y `FTP_PASSWORD` (los de la cuenta nueva), `SMTP_PASSWORD`, `SHEETS_URL`, `SHEETS_TOKEN`.
5. **Actions → Publicar en Hostgator → Run workflow → produccion.**

Al publicar en producción, el workflow agrega solo: redirección a https y sin www, y 301 al inicio para cualquier página vieja de WordPress que ya no exista (anuncios o enlaces viejos no dan error). No agrega `noindex`.

Los push a `main` siguen publicando solo en staging. Producción siempre es manual: después de cada cambio aprobado en staging, se vuelve a correr el paso 5.

## 6. Cambios frecuentes

- **Precios (finales, el sitio no menciona IVA):** en `site/assets/js/config.js` (cotizador) **y** en el texto de `site/index.html` (hero, sección de precios y preguntas frecuentes).
- **Promoción:** `promo` en `config.js` (porcentaje, fecha de inicio y fin). La franja roja, el contador y los precios tachados aparecen solos dentro de esas fechas y desaparecen al terminar. Para quitarla antes: `active: false`.
- **Modelos de ejemplo por tipo de vehículo:** `examples` y `models` en `config.js` (alimentan el buscador del cotizador).
- **Horarios de citas:** `slots` en `config.js`.
- **Textos:** directamente en `site/index.html`.
- **Fotos:** en `site/assets/img/`. Mantén el mismo nombre de archivo o actualiza el `src` en `index.html`. Tamaño recomendado: máx. 1600 px de ancho y menos de 300 KB.
