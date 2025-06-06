<?php
require_once __DIR__ . '/../../config_getij.php';

$file = BASE_PATH . '/data/tideData.json';
$logFile = BASE_PATH . '/data/update.log';
$url = "https://rws-proxy.onrender.com/api/getijden";

$body = [
    "Locatie" => ["Code" => "SCHEVNGN", "X" => 586550.994420996, "Y" => 5772806.43069697],
    "AquoPlusWaarnemingMetadata" => ["AquoMetadata" => ["Groepering" => ["Code" => "GETETBRKD2"]]],
    "Periode" => [
        "Begindatumtijd" => date("Y-m-d\TH:i:s.000+01:00", strtotime("-1 day 18:00")),
        "Einddatumtijd" => date("Y-m-d\TH:i:s.000+01:00", strtotime("+4 days 00:00"))
    ]
];

$options = [
    "http" => [
        "header" => "Content-Type: application/json\r\n",
        "method" => "POST",
        "content" => json_encode($body)
    ]
];

$context = stream_context_create($options);
$response = file_get_contents($url, false, $context);

// **Logfunctie**
function logMessage($message) {
    global $logFile;
    $timestamp = date("Y-m-d H:i:s");
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

if ($response) {
    file_put_contents($file, $response);
    logMessage("✅ Data succesvol opgeslagen.");
    echo "✅ Data succesvol opgeslagen!";
} else {
    logMessage("❌ Fout bij ophalen van getijdendata.");
    echo "⚠️ Fout bij het ophalen van getijdendata.";
}
?>
