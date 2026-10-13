<?php
/**
 * Recibe las citas del agendador y las envía por correo.
 * Además guarda un respaldo en CSV FUERA de la carpeta pública, por si algún correo no llega.
 *
 * Configura el correo de destino aquí abajo.
 */

$CONFIG = [
    // A quién le llegan las citas (puedes poner varios separados por coma).
    'to'         => 'contacto@rhinolinings.com.mx',
    // Remitente. Debe ser una cuenta del MISMO dominio creada en cPanel, para que no caiga en spam.
    'from'       => 'citas@rhinolinings.com.mx',
    'from_name'  => 'Citas · Sitio Rhino Linings GDL',
    // Respaldo: en la carpeta de la cuenta (/home/usuario/citas-privadas), FUERA de public_html,
    // para que nunca se pueda abrir desde internet.
    'backup_csv' => (strpos(__DIR__, '/public_html') !== false
        ? substr(__DIR__, 0, strpos(__DIR__, '/public_html'))
        : dirname(__DIR__, 2)) . '/citas-privadas/citas-rhinolinings.csv',
    // Máximo de envíos por IP cada 10 minutos.
    'rate_limit' => 5,
];

date_default_timezone_set('America/Mexico_City');
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Cache-Control: no-store');

function respond($ok, $code = 200) {
    http_response_code($code);
    echo json_encode(['ok' => (bool) $ok]);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(false, 405);
}

// Anti-spam: campo trampa y envío demasiado rápido. Se responde "ok" para no dar pistas al bot.
if (!empty($_POST['empresa_web'])) {
    respond(true);
}
$t = isset($_POST['t']) ? (int) $_POST['t'] : 0;
if ($t > 0 && (microtime(true) * 1000 - $t) < 3000) {
    respond(true);
}

// Límite por IP.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'desconocida';
$rlFile = sys_get_temp_dir() . '/rl_cita_' . md5($ip);
$now = time();
$hits = [];
if (is_readable($rlFile)) {
    $hits = array_filter(array_map('intval', explode(',', (string) @file_get_contents($rlFile))), function ($h) use ($now) {
        return $h > $now - 600;
    });
}
if (count($hits) >= $CONFIG['rate_limit']) {
    respond(false, 429);
}
$hits[] = $now;
@file_put_contents($rlFile, implode(',', $hits));

function field($key, $max = 200) {
    $v = isset($_POST[$key]) ? (string) $_POST[$key] : '';
    $v = strip_tags($v);
    $v = str_replace(["\r", "\n", "\t"], ' ', $v);
    $v = trim(preg_replace('/\s+/u', ' ', $v));
    return mb_substr($v, 0, $max, 'UTF-8');
}

$d = [
    'nombre'          => field('nombre', 120),
    'whatsapp'        => preg_replace('/\D/', '', field('whatsapp', 30)),
    'modelo'          => field('modelo', 120),
    'urgencia'        => field('urgencia', 60),
    'vehiculo'        => field('vehiculo', 60),
    'precio'          => field('precio', 60),
    'precio_aceptado' => field('precio_aceptado', 5),
    'fecha'           => field('fecha', 10),
    'fecha_texto'     => field('fecha_texto', 40),
    'hora'            => field('hora', 5),
    'pagina'          => field('pagina', 500),
    'utm_source'      => field('utm_source', 100),
    'utm_medium'      => field('utm_medium', 100),
    'utm_campaign'    => field('utm_campaign', 150),
    'utm_content'     => field('utm_content', 150),
    'utm_term'        => field('utm_term', 150),
    'fbclid'          => field('fbclid', 300),
    'gclid'           => field('gclid', 300),
];

// Validación mínima.
if (mb_strlen($d['nombre'], 'UTF-8') < 2
    || strlen($d['whatsapp']) < 10
    || $d['vehiculo'] === ''
    || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $d['fecha'])
    || !preg_match('/^\d{1,2}:\d{2}$/', $d['hora'])
    || $d['precio_aceptado'] !== 'si') {
    respond(false, 422);
}

$wa = strlen($d['whatsapp']) === 10 ? '52' . $d['whatsapp'] : $d['whatsapp'];
$origen = $d['utm_source'] !== '' ? $d['utm_source'] . ($d['utm_campaign'] !== '' ? ' / ' . $d['utm_campaign'] : '') : 'Directo / sin campaña';
if ($d['utm_source'] === '' && $d['fbclid'] !== '') { $origen = 'Meta (fbclid)'; }
if ($d['utm_source'] === '' && $d['gclid'] !== '') { $origen = 'Google Ads (gclid)'; }

$subject = 'Nueva cita: ' . $d['vehiculo'] . ' · ' . $d['fecha_texto'] . ' ' . $d['hora'] . ' · ' . $d['nombre'];

$lines = [
    'Nueva cita agendada desde el sitio web',
    '',
    'Cliente:     ' . $d['nombre'],
    'WhatsApp:    ' . $d['whatsapp'] . '  →  https://wa.me/' . $wa,
    'Vehículo:    ' . $d['vehiculo'] . ($d['modelo'] !== '' ? ' (' . $d['modelo'] . ')' : ''),
    'Precio:      ' . $d['precio'],
    'Aceptó precio: Sí',
    '',
    'Día:         ' . $d['fecha_texto'] . ' (' . $d['fecha'] . ')',
    'Hora:        ' . $d['hora'] . ' h',
    'Urgencia:    ' . $d['urgencia'],
    '',
    'Origen:      ' . $origen,
];
foreach (['utm_medium', 'utm_content', 'utm_term'] as $k) {
    if ($d[$k] !== '') { $lines[] = str_pad($k . ':', 13) . $d[$k]; }
}
$lines[] = 'Página:      ' . $d['pagina'];
$lines[] = 'Recibida:    ' . date('Y-m-d H:i');
$body = implode("\n", $lines) . "\n";

$fromName = '=?UTF-8?B?' . base64_encode($CONFIG['from_name']) . '?=';
$headers = [
    'From: ' . $fromName . ' <' . $CONFIG['from'] . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: rhinolinings-web',
];
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

$sent = false;
$via = 'ninguno';

// 1) SMTP autenticado (recomendado). La configuración la escribe la publicación automática
//    en .htsmtp (JSON) a partir del secreto SMTP_PASSWORD de GitHub; no está en el repositorio.
//    Apache bloquea por defecto los archivos que empiezan con ".ht", así que no se puede descargar.
$smtpFile = __DIR__ . '/.htsmtp';
if (is_readable($smtpFile)) {
    $smtp = json_decode((string) file_get_contents($smtpFile), true);
    if (is_array($smtp) && !empty($smtp['pass'])) {
        require_once __DIR__ . '/lib/PHPMailer/Exception.php';
        require_once __DIR__ . '/lib/PHPMailer/PHPMailer.php';
        require_once __DIR__ . '/lib/PHPMailer/SMTP.php';
        try {
            $m = new PHPMailer\PHPMailer\PHPMailer(true);
            $m->isSMTP();
            $m->Host = $smtp['host'];
            $m->Port = (int) $smtp['port'];
            $m->SMTPSecure = $smtp['secure'];
            $m->SMTPAuth = true;
            $m->Username = $smtp['user'];
            $m->Password = $smtp['pass'];
            $m->Timeout = 15;
            $m->CharSet = 'UTF-8';
            $m->setFrom($smtp['user'], $CONFIG['from_name']);
            foreach (array_filter(array_map('trim', explode(',', $CONFIG['to']))) as $addr) {
                $m->addAddress($addr);
            }
            $m->Subject = $subject;
            $m->Body = $body;
            $m->isHTML(false);
            $m->send();
            $sent = true;
            $via = 'smtp';
        } catch (Exception $e) {
            error_log('cita.php SMTP: ' . (isset($m) ? $m->ErrorInfo : $e->getMessage()));
        }
    }
}

// 2) Respaldo: mail() del servidor.
if (!$sent) {
    $sent = @mail($CONFIG['to'], $encodedSubject, $body, implode("\r\n", $headers), '-f' . $CONFIG['from']);
    if (!$sent) {
        $sent = @mail($CONFIG['to'], $encodedSubject, $body, implode("\r\n", $headers));
    }
    if ($sent) { $via = 'mail'; }
}

// Respaldo en CSV (fuera de la carpeta pública).
$saved = false;
$csv = $CONFIG['backup_csv'];
if (!is_dir(dirname($csv))) {
    @mkdir(dirname($csv), 0700, true);
}
$isNew = !file_exists($csv);
$fh = @fopen($csv, 'a');
if ($fh) {
    if (flock($fh, LOCK_EX)) {
        if ($isNew) {
            fputcsv($fh, array_merge(['recibida', 'correo_enviado', 'via'], array_keys($d)));
        }
        fputcsv($fh, array_merge([date('Y-m-d H:i:s'), $sent ? 'si' : 'no', $via], array_values($d)));
        flock($fh, LOCK_UN);
        $saved = true;
    }
    fclose($fh);
}

respond($sent || $saved, ($sent || $saved) ? 200 : 500);
