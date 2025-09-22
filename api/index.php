<?php
// RUSH Dashboard API - Versione semplificata che replica il comportamento originale
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// Configurazione database diretta
$host = 'localhost';
$database = 'rush_dashboard';
$username = 'admin.dashboard';
$password = 'Rush2025!!';
$charset = 'utf8mb4';

try {
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $host, $database, $charset);
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Connessione al database fallita', 'details' => $e->getMessage()]);
    exit;
}

// Schema sync minimo
try {
    ensureBasicSchema($pdo);
} catch (Throwable $e) {
    http_response_code(503);
    echo json_encode(['error' => 'Errore schema', 'details' => $e->getMessage()]);
    exit;
}

// Routing semplificato
$method = $_SERVER['REQUEST_METHOD'];
$path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '', '/');
$segments = $path ? explode('/', $path) : [];

if (!empty($segments) && $segments[0] === 'api') {
    array_shift($segments);
}

$endpoint = $segments[0] ?? '';

try {
    switch ($endpoint) {
        case 'health':
            if ($method === 'GET') {
                echo json_encode(['status' => 'ok', 'timestamp' => time()]);
            }
            break;
            
        case 'login':
            if ($method === 'POST') {
                handleLogin($pdo);
            }
            break;
            
        case 'logout':
            if ($method === 'POST') {
                handleLogout($pdo);
            }
            break;
            
        case 'profile':
            if ($method === 'GET') {
                handleProfile($pdo);
            }
            break;
            
        case 'uploads':
            if ($method === 'GET') {
                handleUploads($pdo);
            } elseif ($method === 'POST') {
                handleFileUpload($pdo);
            }
            break;
            
        case 'file-data':
            if ($method === 'GET') {
                handleFileData($pdo);
            }
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint non trovato']);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Errore server', 'details' => $e->getMessage()]);
}

exit;

// === FUNZIONI CORE ===

function ensureBasicSchema(PDO $pdo): void
{
    // Verifica solo esistenza tabelle principali
    $tables = ['users', 'uploaded_files'];
    foreach ($tables as $table) {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        if (!$stmt->fetch()) {
            throw new RuntimeException("Tabella $table mancante");
        }
    }
    
    // Crea user_sessions se manca
    $stmt = $pdo->query("SHOW TABLES LIKE 'user_sessions'");
    if (!$stmt->fetch()) {
        $pdo->exec("
            CREATE TABLE user_sessions (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNSIGNED NOT NULL,
                session_token VARCHAR(128) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        ");
    }
}

function getAuthorizationToken(): ?string
{
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $token = $headers['Authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? null;
    return $token ? preg_replace('/^Bearer\s+/i', '', $token) : null;
}

function getJsonInput(): array
{
    $input = json_decode(file_get_contents('php://input'), true);
    return is_array($input) ? $input : [];
}

function decodeJsonColumn($value, $default = null)
{
    if (is_array($value)) {
        return $value;
    }

    if (is_object($value)) {
        return json_decode(json_encode($value), true);
    }

    if (is_string($value)) {
        $value = trim($value);
        if ($value === '') {
            return $default;
        }

        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return is_array($decoded) ? $decoded : $default;
        }
    }

    if ($value === null || $value === '') {
        return $default;
    }

    return $default;
}

function normalizeUploadedFile(array $file): array
{
    $agentsData = decodeJsonColumn($file['agents_data'] ?? null, []);
    $smRanking = decodeJsonColumn($file['sm_ranking'] ?? null, []);
    $metadataFromColumn = decodeJsonColumn($file['metadata'] ?? null, []);
    $fileData = decodeJsonColumn($file['file_data'] ?? null, null);

    $numericMap = [
        'total_agents' => ['totalAgents', 'int'],
        'total_sms' => ['totalSMs', 'int'],
        'total_revenue' => ['totalRevenue', 'float'],
        'total_inflow' => ['totalInflow', 'float'],
        'total_new_clients' => ['totalNewClients', 'int'],
        'total_fastweb' => ['totalFastweb', 'int'],
        'total_rush' => ['totalRush', 'float'],
    ];

    $totalsForClient = [];

    foreach ($numericMap as $column => [$clientKey, $type]) {
        if (!array_key_exists($column, $file)) {
            continue;
        }

        $value = $file[$column];
        if ($value === null || $value === '') {
            continue;
        }

        if ($type === 'int') {
            $totalsForClient[$clientKey] = (int) $value;
        } else {
            $totalsForClient[$clientKey] = (float) $value;
        }
    }

    $metadata = array_merge(
        is_array($metadataFromColumn) ? $metadataFromColumn : [],
        $totalsForClient
    );

    if (is_array($fileData)) {
        $fileDataMetadata = isset($fileData['metadata']) && is_array($fileData['metadata'])
            ? $fileData['metadata']
            : [];
        $fileData['metadata'] = array_merge($fileDataMetadata, $metadata);
    } else {
        $fileData = [
            'metadata' => $metadata,
        ];
    }

    if (!isset($fileData['agents']) && !empty($agentsData)) {
        $fileData['agents'] = $agentsData;
    }

    if (!isset($fileData['smRanking']) && !empty($smRanking)) {
        $fileData['smRanking'] = $smRanking;
    }

    $file['agents_data'] = $agentsData;
    $file['sm_ranking'] = $smRanking;
    $file['metadata'] = $metadata;
    $file['file_data'] = $fileData;

    return $file;
}

// === HANDLERS ===

function handleLogin(PDO $pdo): void
{
    $input = getJsonInput();
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';

    if (!$username || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Username e password richiesti']);
        return;
    }

    $stmt = $pdo->prepare('SELECT id, username, password_hash, role, full_name FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Credenziali non valide']);
        return;
    }

    $token = bin2hex(random_bytes(32));
    $expires = (new DateTime('+2 hours'))->format('Y-m-d H:i:s');

    $pdo->prepare('DELETE FROM user_sessions WHERE user_id = ?')->execute([$user['id']]);
    $pdo->prepare('INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)')
        ->execute([$user['id'], $token, $expires]);

    echo json_encode([
        'success' => true,
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'full_name' => $user['full_name']
        ]
    ]);
}

function handleLogout(PDO $pdo): void
{
    $token = getAuthorizationToken();
    if ($token) {
        $pdo->prepare('DELETE FROM user_sessions WHERE session_token = ?')->execute([$token]);
    }
    echo json_encode(['success' => true]);
}

function handleProfile(PDO $pdo): void
{
    $token = getAuthorizationToken();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'Token mancante']);
        return;
    }

    $stmt = $pdo->prepare('
        SELECT u.id, u.username, u.role, u.full_name 
        FROM users u 
        JOIN user_sessions s ON u.id = s.user_id 
        WHERE s.session_token = ? AND s.expires_at > NOW()
    ');
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Sessione non valida']);
        return;
    }

    echo json_encode(['success' => true, 'user' => $user]);
}

function handleUploads(PDO $pdo): void
{
    // Modalità permissiva per ora - restituisce tutti i dati come originale
    $stmt = $pdo->prepare('SELECT * FROM uploaded_files ORDER BY file_date DESC');
    $stmt->execute();
    $files = $stmt->fetchAll();

    $normalizedFiles = array_map('normalizeUploadedFile', $files);

    echo json_encode([
        'success' => true,
        'files' => $normalizedFiles
    ]);
}

function handleFileData(PDO $pdo): void
{
    // Estrae data dall'URL
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $segments = explode('/', trim($path, '/'));
    
    $fileDate = null;
    for ($i = 0; $i < count($segments); $i++) {
        if ($segments[$i] === 'file-data' && isset($segments[$i + 1])) {
            $fileDate = $segments[$i + 1];
            break;
        }
    }
    
    if (!$fileDate) {
        $fileDate = $_GET['date'] ?? null;
    }
    
    if (!$fileDate) {
        http_response_code(400);
        echo json_encode(['error' => 'Data mancante']);
        return;
    }

    $stmt = $pdo->prepare('SELECT * FROM uploaded_files WHERE file_date = ?');
    $stmt->execute([$fileDate]);
    $file = $stmt->fetch();

    if (!$file) {
        http_response_code(404);
        echo json_encode(['error' => 'File non trovato']);
        return;
    }

    $normalized = normalizeUploadedFile($file);

    echo json_encode($normalized);
}

function handleFileUpload(PDO $pdo): void
{
    echo json_encode(['success' => true, 'message' => 'Upload endpoint attivo']);
}
?>