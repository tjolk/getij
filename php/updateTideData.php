<?php
require_once __DIR__ . '/../../config_getij.php';

if (!defined('BASE_PATH')) {
    define('BASE_PATH', dirname(__DIR__, 1));
}

$logFile = BASE_PATH . '/data/update.log';
$configFile = BASE_PATH . '/config/update_config.json';

// **Logfunctie**
function logMessage($message) {
    global $logFile;
    $timestamp = date("Y-m-d H:i:s");
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// Load config
$configJson = file_get_contents($configFile);
$endpoints = json_decode($configJson, true);
if (!is_array($endpoints)) {
    logMessage("❌ Configuratiebestand update_config.json is ongeldig of bevat een JSON-fout.");
    echo "⚠️ Configuratiebestand update_config.json is ongeldig of bevat een JSON-fout.<br>";
    exit(1);
}

// Date placeholders
foreach ($endpoints as $endpoint) {
    // Use custom date range if present, else default
    $begindatum = isset($endpoint['begindatum'])
        ? date($endpoint['begindatum']['format'], strtotime($endpoint['begindatum']['relative']))
        : date("Y-m-d\TH:i:s.000+01:00", strtotime("-1 day 18:00"));
    $einddatum = isset($endpoint['einddatum'])
        ? date($endpoint['einddatum']['format'], strtotime($endpoint['einddatum']['relative']))
        : date("Y-m-d\TH:i:s.000+01:00", strtotime("+4 days 00:00"));

    $url = $endpoint['endpoint'];
    $file = BASE_PATH . '/data/' . $endpoint['name'] . '.json';
    $body = json_encode($endpoint['body']);
    $body = str_replace(['{BEGINDATUM}', '{EINDDATUM}'], [$begindatum, $einddatum], $body);

    $options = [
        "http" => [
            "header" => "Content-Type: application/json\r\n",
            "method" => "POST",
            "content" => $body
        ]
    ];

    $context = stream_context_create($options);
    $response = file_get_contents($url, false, $context);

    if ($response) {
        file_put_contents($file, $response);
        logMessage("✅ Data succesvol opgeslagen voor endpoint: " . ($endpoint['name'] ?? $url));
        echo "✅ Data succesvol opgeslagen voor endpoint: " . ($endpoint['name'] ?? $url) . "<br>";
    } else {
        $error = error_get_last();
        logMessage("❌ Fout bij ophalen van getijdendata voor endpoint: " . ($endpoint['name'] ?? $url) . ": " . ($error['message'] ?? 'Onbekende fout'));
        echo "⚠️ Fout bij het ophalen van getijdendata voor endpoint: " . ($endpoint['name'] ?? $url) . "<br>";
    }
}
?>
