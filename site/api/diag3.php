<?php
// Diagnóstico temporal del envío de correo. Se elimina después de resolver el problema.
header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Cache-Control: no-store');
if (hash('sha256', (string)($_GET['k'] ?? '')) !== 'b99160385f303ed594301f621680842fd61acc7fd40237774212cfec6917d63c') { http_response_code(404); exit; }

echo "diag v3 · PHP " . PHP_VERSION . "\n";
foreach ([['ssl://smtp.titan.email', 465], ['smtp.titan.email', 587], ['smtp.titan.email', 25]] as $t) {
    $e = 0; $s = '';
    $fp = @fsockopen($t[0], $t[1], $e, $s, 8);
    echo "Conexión " . $t[0] . ":" . $t[1] . " -> " . ($fp ? "OK" : "FALLA ($e $s)") . "\n";
    if ($fp) { fclose($fp); }
}

$cfg = __DIR__ . '/smtp-config.php';
echo "smtp-config.php: " . (is_readable($cfg) ? "existe" : "NO existe") . "\n";
if (is_readable($cfg)) {
    $c = include $cfg;
    echo "Usuario SMTP: " . $c['user'] . " | host " . $c['host'] . ":" . $c['port'] . " | contraseña de " . strlen($c['pass']) . " caracteres\n";
    require_once __DIR__ . '/lib/PHPMailer/Exception.php';
    require_once __DIR__ . '/lib/PHPMailer/PHPMailer.php';
    require_once __DIR__ . '/lib/PHPMailer/SMTP.php';
    foreach ([['ssl://' . $c['host'], 465, false], [$c['host'], 587, true]] as $p) {
        $smtp = new PHPMailer\PHPMailer\SMTP();
        $smtp->Timeout = 10;
        $step = 'conectar';
        $ok = $smtp->connect($p[0], $p[1], 10);
        if ($ok) { $step = 'saludo'; $ok = $smtp->hello('rhinolinings.com.mx'); }
        if ($ok && $p[2]) { $step = 'starttls'; $ok = $smtp->startTLS() && $smtp->hello('rhinolinings.com.mx'); }
        if ($ok) { $step = 'login'; $ok = $smtp->authenticate($c['user'], $c['pass'], 'LOGIN'); }
        $err = $smtp->getError();
        echo "SMTP puerto " . $p[1] . ": " . ($ok ? "LOGIN OK" : "falló en '" . $step . "' -> " . trim(($err['error'] ?? '') . ' | ' . ($err['smtp_code'] ?? '') . ' ' . ($err['detail'] ?? ''))) . "\n";
        $smtp->quit(); $smtp->close();
    }
}

$home = strpos(__DIR__, '/public_html') !== false ? substr(__DIR__, 0, strpos(__DIR__, '/public_html')) : dirname(__DIR__, 2);
$csv = $home . '/citas-privadas/citas-rhinolinings.csv';
echo "Respaldo CSV: " . (is_readable($csv) ? "existe" : "no existe") . "\n";
if (is_readable($csv)) {
    $rows = array_map('str_getcsv', file($csv));
    $h = array_shift($rows);
    foreach (array_slice($rows, -3) as $r) { echo "  " . $r[0] . " | correo_enviado=" . $r[1] . (in_array('via', $h) ? " | via=" . $r[2] : "") . "\n"; }
}
