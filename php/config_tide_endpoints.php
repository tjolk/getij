<?php
// config_tide_endpoints.php
// Load endpoint configs from a JSON file for easier editing and copy-paste from API docs

$endpointsJson = file_get_contents(__DIR__ . '/config_tide_endpoints.json');
$endpoints = json_decode($endpointsJson, true);

// Add BASE_PATH and dynamic date handling to each endpoint
foreach ($endpoints as &$endpoint) {
    if (isset($endpoint['file']) && strpos($endpoint['file'], 'BASE_PATH') !== false) {
        $endpoint['file'] = str_replace('BASE_PATH', defined('BASE_PATH') ? BASE_PATH : dirname(__DIR__, 1), $endpoint['file']);
    }
    // Replace date placeholders if present
    if (isset($endpoint['body'])) {
        $endpoint['body'] = json_decode(
            str_replace([
                '{BEGINDATUM}', '{EINDDATUM}'
            ], [
                date("Y-m-d\TH:i:s.000+01:00", strtotime("-1 day 18:00")),
                date("Y-m-d\TH:i:s.000+01:00", strtotime("+4 days 00:00"))
            ],
            json_encode($endpoint['body'])
        ), true);
    }
}
return $endpoints;
