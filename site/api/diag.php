<?php
// Diagnóstico temporal del envío de correo. Se elimina después de resolver el problema.
header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex');
if (hash('sha256', (string)($_GET['k'] ?? '')) !== 'b99160385f303ed594301f621680842fd61acc7fd40237774212cfec6917d63c') { http_response_code(404); exit; }

echo "PHP " . PHP_VERSION . "\n";
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
    foreach ([[465, 'ssl'], [587, 'tls']] as $p) {
        $m = new PHPMailer\PHPMailer\PHPMailer(true);
        try {
            $m->isSMTP(); $m->Host = $c['host']; $m->Port = $p[0]; $m->SMTPSecure = $p[1];
            $m->SMTPAuth = true; $m->Username = $c['user']; $m->Password = $c['pass']; $m->Timeout = 10;
            $log = [];
            $m->SMTPDebug = 2;
            $m->Debugoutput = function ($str) use (&$log) { if (strpos($str, 'SERVER -> CLIENT') !== false) { $log[] = trim($str); } };
            $ok = $m->smtpConnect();
            echo "Login SMTP puerto " . $p[0] . ": " . ($ok ? "OK" : "falló") . "\n";
            $m->smtpClose();
        } catch (Exception $ex) {
            echo "Login SMTP puerto " . $p[0] . ": ERROR " . $ex->getMessage() . "\n";
        }
        foreach (array_slice($log, -4) as $l) { echo "    " . $l . "\n"; }
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
