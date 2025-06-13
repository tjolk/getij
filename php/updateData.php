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

foreach ($endpoints as $endpoint) {
    if (isset($endpoint['body']) && isset($endpoint['begindatum']) && isset($endpoint['einddatum'])) {
        // --- RWS API (POST) ---
        $begindatum = date($endpoint['begindatum']['format'], strtotime($endpoint['begindatum']['relative']));
        $einddatum = date($endpoint['einddatum']['format'], strtotime($endpoint['einddatum']['relative']));
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
    } elseif (isset($endpoint['lat']) && isset($endpoint['long']) && isset($endpoint['days'])) {
        // --- ipgeolocation API (GET, 2 days) ---
        if (!defined('IPGEOLOCATION_API_KEY')) {
            logMessage('❌ IPGEOLOCATION_API_KEY is not defined in config_getij.php');
            continue;
        }
        $apiKey = IPGEOLOCATION_API_KEY;
        $url = $endpoint['endpoint'];
        $lat = $endpoint['lat'];
        $long = $endpoint['long'];
        $days = intval($endpoint['days']);
        $results = [];
        for ($i = 0; $i < $days; $i++) {
            $date = date('Y-m-d', strtotime("+$i day"));
            $query = http_build_query([
                'apiKey' => $apiKey,
                'lat' => $lat,
                'long' => $long,
                'date' => $date
            ]);
            $fullUrl = $url . '?' . $query;
            $response = file_get_contents($fullUrl);
            if ($response) {
                $results[$date] = json_decode($response, true);
            } else {
                $error = error_get_last();
                logMessage("❌ Fout bij ophalen van ipgeolocation data voor $date: " . ($error['message'] ?? 'Onbekende fout'));
            }
        }
        $file = BASE_PATH . '/data/' . $endpoint['name'] . '.json';
        file_put_contents($file, json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        logMessage("✅ Data succesvol opgeslagen voor endpoint: " . ($endpoint['name'] ?? $url));
        echo "✅ Data succesvol opgeslagen voor endpoint: " . ($endpoint['name'] ?? $url) . "<br>";
    }
}
?>
