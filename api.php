<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

$jsonFile = 'data.json';

// Dosya yoksa boş bir array ile oluştur
if (!file_exists($jsonFile)) {
    file_put_contents($jsonFile, json_encode([]));
}

$method = $_SERVER['REQUEST_METHOD'];

// JSON dosyasını oku
function getLocations($file) {
    $content = file_get_contents($file);
    return json_decode($content, true) ?: [];
}

// JSON dosyasına yaz
function saveLocations($file, $data) {
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

switch ($method) {
    case 'GET':
        echo file_get_contents($jsonFile);
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        if ($input) {
            $locations = getLocations($jsonFile);
            
            $newLoc = [
                "id" => time() . rand(100, 999),
                "lat" => $input['lat'],
                "lng" => $input['lng'],
                "title" => $input['title'] ?? '',
                "description" => $input['description'] ?? '',
                "video_url" => $input['video'] ?? '',
                "audio_url" => $input['audio'] ?? '',
                "image_url" => $input['image'] ?? '',
                "created_at" => date('Y-m-d H:i:s')
            ];
            
            $locations[] = $newLoc;
            saveLocations($jsonFile, $locations);
            
            echo json_encode(["success" => true, "id" => $newLoc['id']]);
        }
        break;

    case 'PUT':
    case 'PATCH':
        $input = json_decode(file_get_contents("php://input"), true);
        if ($input && isset($input['id'])) {
            $locations = getLocations($jsonFile);
            
            foreach ($locations as $key => $loc) {
                if ($loc['id'] == $input['id']) {
                    $locations[$key] = [
                        "id" => $input['id'],
                        "lat" => $input['lat'] ?? $loc['lat'],
                        "lng" => $input['lng'] ?? $loc['lng'],
                        "title" => $input['title'] ?? $loc['title'],
                        "description" => $input['description'] ?? $loc['description'],
                        "video_url" => $input['video'] ?? $loc['video_url'],
                        "audio_url" => $input['audio'] ?? $loc['audio_url'],
                        "image_url" => $input['image'] ?? $loc['image_url'],
                        "created_at" => $loc['created_at']
                    ];
                    saveLocations($jsonFile, $locations);
                    echo json_encode(["success" => true]);
                    exit;
                }
            }
            echo json_encode(["success" => false, "error" => "ID bulunamadı"]);
        }
        break;

    case 'DELETE':
        if (isset($_GET['id'])) {
            $id = $_GET['id'];
            $locations = getLocations($jsonFile);
            
            $filtered = array_filter($locations, function($loc) use ($id) {
                return $loc['id'] != $id;
            });
            
            saveLocations($jsonFile, array_values($filtered));
            echo json_encode(["success" => true]);
        }
        break;
    
    case 'OPTIONS':
        http_response_code(200);
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Metod desteklenmiyor"]);
        break;
}
?>
