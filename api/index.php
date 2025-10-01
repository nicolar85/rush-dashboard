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

    // Aggiorna schema uploaded_files con le colonne utilizzate da handleFileUpload
    $columns = [
        'agents_data' => 'LONGTEXT NULL',
        'sm_ranking' => 'LONGTEXT NULL',
        'metadata' => 'LONGTEXT NULL',
        'file_data' => 'LONGTEXT NULL',
        'total_agents' => 'INT NULL',
        'total_sms' => 'INT NULL',
        'total_revenue' => 'DECIMAL(15,2) NULL',
        'total_inflow' => 'DECIMAL(15,2) NULL',
        'total_new_clients' => 'INT NULL',
        'total_fastweb' => 'INT NULL',
        'total_rush' => 'DECIMAL(15,2) NULL',
        'display_date' => 'VARCHAR(20) NULL',
        'file_size' => 'INT NULL',
        'upload_date' => 'DATETIME NULL',
        'uploaded_by' => 'INT NULL',
    ];

    try {
        foreach ($columns as $column => $definition) {
            $stmt = $pdo->prepare('SHOW COLUMNS FROM uploaded_files LIKE ?');
            $stmt->execute([$column]);

            if ($stmt->fetch()) {
                continue;
            }

            $pdo->exec(sprintf('ALTER TABLE uploaded_files ADD COLUMN %s %s', $column, $definition));
        }
    } catch (Throwable $e) {
        throw new RuntimeException('Impossibile aggiornare lo schema di uploaded_files: ' . $e->getMessage(), 0, $e);
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
        'total_inflow' => ['totalRush', 'float'],
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
        $totalsForClient,
        is_array($metadataFromColumn) ? $metadataFromColumn : []
    );

    if (!array_key_exists('totalRush', $metadata)) {
        if (array_key_exists('total_inflow', $file) && $file['total_inflow'] !== null && $file['total_inflow'] !== '') {
            $metadata['totalRush'] = (float) $file['total_inflow'];
        } elseif (isset($metadataFromColumn['totalRush'])) {
            $metadata['totalRush'] = (float) $metadataFromColumn['totalRush'];
        } else {
            $metadata['totalRush'] = 0.0;
        }
    }

    if (!array_key_exists('totalInflow', $metadata) && isset($metadata['totalRush'])) {
        $metadata['totalInflow'] = $metadata['totalRush'];
    }

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
        'expires_at' => $expires,
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
    $token = getAuthorizationToken();

    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Token di autenticazione mancante']);
        return;
    }

    $stmt = $pdo->prepare(
        'SELECT u.id, u.role FROM users u JOIN user_sessions s ON u.id = s.user_id WHERE s.session_token = ? AND s.expires_at > NOW()'
    );
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Token non valido o sessione scaduta']);
        return;
    }

    if (($user['role'] ?? '') !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Permessi insufficienti per caricare file']);
        return;
    }

    $input = getJsonInput();
    $fileData = $input['fileData'] ?? null;

    if (!is_array($fileData)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Payload fileData mancante o non valido']);
        return;
    }

    $fileName = trim((string)($fileData['name'] ?? ''));
    $fileDate = trim((string)($fileData['date'] ?? ''));
    $displayDate = isset($fileData['displayDate']) ? trim((string)$fileData['displayDate']) : null;
    $displayDate = $displayDate === '' ? null : $displayDate;

    $fileSize = $fileData['size'] ?? null;
    if ($fileSize === '' || $fileSize === null) {
        $fileSize = null;
    } else {
        $fileSize = (int)$fileSize;
    }
    $rawData = $fileData['data'] ?? null;

    if ($fileName === '' || $fileDate === '' || !is_array($rawData)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Nome file, data e dati elaborati sono obbligatori']);
        return;
    }

    $agentsData = is_array($rawData['agents'] ?? null) ? $rawData['agents'] : [];
    $smRanking = is_array($rawData['smRanking'] ?? null) ? $rawData['smRanking'] : [];
    $rawMetadata = is_array($rawData['metadata'] ?? null) ? $rawData['metadata'] : [];
    $fileMetadata = is_array($fileData['metadata'] ?? null) ? $fileData['metadata'] : [];

    $mergedMetadata = array_merge($rawMetadata, $fileMetadata);

    $totalAgents = (int)($mergedMetadata['totalAgents'] ?? 0);
    $totalSMs = (int)($mergedMetadata['totalSMs'] ?? 0);
    $totalRevenue = (float)($mergedMetadata['totalRevenue'] ?? 0);
    $totalRush = (float)($mergedMetadata['totalRush'] ?? ($mergedMetadata['totalInflow'] ?? 0));
    $totalInflow = (float)($mergedMetadata['totalInflow'] ?? $totalRush);
    $totalNewClients = (int)($mergedMetadata['totalNewClients'] ?? 0);
    $totalFastweb = (int)($mergedMetadata['totalFastweb'] ?? 0);

    $totalsMetadata = [
        'totalAgents' => $totalAgents,
        'totalSMs' => $totalSMs,
        'totalRevenue' => $totalRevenue,
        'totalRush' => $totalRush,
        'totalInflow' => $totalInflow,
        'totalNewClients' => $totalNewClients,
        'totalFastweb' => $totalFastweb,
    ];

    $metadata = array_merge($mergedMetadata, $totalsMetadata);

    $rawData['metadata'] = $metadata;

    $agentsJson = json_encode($agentsData, JSON_UNESCAPED_UNICODE);
    $smRankingJson = json_encode($smRanking, JSON_UNESCAPED_UNICODE);
    $metadataJson = json_encode($metadata, JSON_UNESCAPED_UNICODE);
    $fileDataJson = json_encode($rawData, JSON_UNESCAPED_UNICODE);

    foreach ([
        'agents_data' => $agentsJson,
        'sm_ranking' => $smRankingJson,
        'metadata' => $metadataJson,
        'file_data' => $fileDataJson,
    ] as $key => $encoded) {
        if ($encoded === false) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Impossibile serializzare {$key}"]);
            return;
        }
    }

    $pdo->beginTransaction();

    try {
        $lookup = $pdo->prepare('SELECT id FROM uploaded_files WHERE file_date = ? LIMIT 1');
        $lookup->execute([$fileDate]);
        $existingId = $lookup->fetchColumn();

        if ($existingId) {
            $stmt = $pdo->prepare(
                'UPDATE uploaded_files SET file_name = ?, display_date = ?, file_size = ?, upload_date = NOW(), uploaded_by = ?, agents_data = ?, sm_ranking = ?, metadata = ?, file_data = ?, total_agents = ?, total_sms = ?, total_revenue = ?, total_inflow = ?, total_new_clients = ?, total_fastweb = ?, total_rush = ? WHERE id = ?'
            );

            $stmt->execute([
                $fileName,
                $displayDate,
                $fileSize,
                $user['id'],
                $agentsJson,
                $smRankingJson,
                $metadataJson,
                $fileDataJson,
                $totalAgents,
                $totalSMs,
                number_format($totalRevenue, 2, '.', ''),
                number_format($totalInflow, 2, '.', ''),
                $totalNewClients,
                $totalFastweb,
                number_format($totalRush, 2, '.', ''),
                $existingId,
            ]);

            $action = 'updated';
        } else {
            $stmt = $pdo->prepare(
                'INSERT INTO uploaded_files (file_date, file_name, display_date, file_size, upload_date, uploaded_by, agents_data, sm_ranking, metadata, file_data, total_agents, total_sms, total_revenue, total_inflow, total_new_clients, total_fastweb, total_rush) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );

            $stmt->execute([
                $fileDate,
                $fileName,
                $displayDate,
                $fileSize,
                $user['id'],
                $agentsJson,
                $smRankingJson,
                $metadataJson,
                $fileDataJson,
                $totalAgents,
                $totalSMs,
                number_format($totalRevenue, 2, '.', ''),
                number_format($totalInflow, 2, '.', ''),
                $totalNewClients,
                $totalFastweb,
                number_format($totalRush, 2, '.', ''),
            ]);

            $action = 'created';
        }

        $pdo->commit();

        echo json_encode(['success' => true, 'action' => $action]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Salvataggio file non riuscito', 'details' => $e->getMessage()]);
    }
}
?>