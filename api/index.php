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

function getTableColumns(PDO $pdo, string $table): array
{
    static $cache = [];

    if (!isset($cache[$table])) {
        $stmt = $pdo->prepare(
            'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?'
        );
        $stmt->execute([$table]);

        $cache[$table] = array_map('strtolower', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    return $cache[$table];
}

function requireAuthenticatedUser(PDO $pdo, bool $mustBeAdmin = false): ?array
{
    $token = getAuthorizationToken();

    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Token mancante']);
        return null;
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
        echo json_encode(['success' => false, 'error' => 'Sessione non valida o scaduta']);
        return null;
    }

    if ($mustBeAdmin && strtolower((string)($user['role'] ?? '')) !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Permessi insufficienti']);
        return null;
    }

    return $user;
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

    echo json_encode([
        'success' => true,
        'files' => $files
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

    echo json_encode(['success' => true, 'data' => $file]);
}

function handleFileUpload(PDO $pdo): void
{
    $user = requireAuthenticatedUser($pdo, true);
    if (!$user) {
        return;
    }

    $input = getJsonInput();
    $fileData = $input['fileData'] ?? null;

    if (!is_array($fileData)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Payload "fileData" mancante o non valido']);
        return;
    }

    $requiredFields = ['name', 'date', 'size', 'data'];
    foreach ($requiredFields as $field) {
        if (!array_key_exists($field, $fileData)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Campo obbligatorio mancante: {$field}"]);
            return;
        }
    }

    $fileName = trim((string)$fileData['name']);
    $fileDate = trim((string)$fileData['date']);
    $fileSize = is_numeric($fileData['size']) ? (int)$fileData['size'] : null;
    $parsedData = $fileData['data'];

    if ($fileName === '' || $fileDate === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Nome file o data non validi']);
        return;
    }

    if ($fileSize === null || $fileSize < 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Dimensione file non valida']);
        return;
    }

    if (!is_array($parsedData)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Struttura "data" non valida']);
        return;
    }

    $displayDate = isset($fileData['displayDate']) ? trim((string)$fileData['displayDate']) : null;
    $displayDate = $displayDate !== '' ? $displayDate : null;

    $metadata = [];
    if (isset($fileData['metadata']) && is_array($fileData['metadata'])) {
        $metadata = $fileData['metadata'];
    } elseif (isset($parsedData['metadata']) && is_array($parsedData['metadata'])) {
        $metadata = $parsedData['metadata'];
    }

    $agents = isset($parsedData['agents']) && is_array($parsedData['agents']) ? $parsedData['agents'] : [];
    $smData = isset($parsedData['smData']) && is_array($parsedData['smData']) ? $parsedData['smData'] : [];

    $totals = [
        'agents' => isset($metadata['totalAgents']) ? (int)$metadata['totalAgents'] : count($agents),
        'sms' => isset($metadata['totalSMs']) ? (int)$metadata['totalSMs'] : count($smData),
        'revenue' => isset($metadata['totalRevenue']) ? (float)$metadata['totalRevenue'] : 0.0,
        'rush' => isset($metadata['totalRush']) ? (float)$metadata['totalRush'] : 0.0,
        'newClients' => isset($metadata['totalNewClients']) ? (int)$metadata['totalNewClients'] : 0,
        'fastweb' => isset($metadata['totalFastweb']) ? (int)$metadata['totalFastweb'] : 0,
    ];

    $totalInflow = isset($metadata['totalInflow']) ? (float)$metadata['totalInflow'] : $totals['rush'];

    $jsonOptions = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;

    $fileDataJson = json_encode($parsedData, $jsonOptions);
    $metadataPayload = !empty($metadata) ? $metadata : new stdClass();
    $metadataJson = json_encode($metadataPayload, $jsonOptions);
    $agentsJson = json_encode($agents, $jsonOptions);
    $smRankingJson = json_encode($smData, $jsonOptions);

    if ($fileDataJson === false || $metadataJson === false || $agentsJson === false || $smRankingJson === false) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Errore nella serializzazione dei dati JSON']);
        return;
    }

    $columns = getTableColumns($pdo, 'uploaded_files');
    $hasColumn = function (string $column) use ($columns): bool {
        return in_array(strtolower($column), $columns, true);
    };

    if (!$hasColumn('file_date') || !$hasColumn('file_name')) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Struttura tabella "uploaded_files" non valida']);
        return;
    }

    $now = (new DateTime())->format('Y-m-d H:i:s');

    $commonData = [];
    $commonData['file_name'] = $fileName;
    if ($hasColumn('display_date')) {
        $commonData['display_date'] = $displayDate;
    }
    if ($hasColumn('file_size')) {
        $commonData['file_size'] = $fileSize;
    }
    if ($hasColumn('uploaded_by')) {
        $commonData['uploaded_by'] = (int)$user['id'];
    }
    if ($hasColumn('total_agents')) {
        $commonData['total_agents'] = $totals['agents'];
    }
    if ($hasColumn('total_sms')) {
        $commonData['total_sms'] = $totals['sms'];
    }
    if ($hasColumn('total_revenue')) {
        $commonData['total_revenue'] = $totals['revenue'];
    }
    if ($hasColumn('total_inflow')) {
        $commonData['total_inflow'] = $totalInflow;
    }
    if ($hasColumn('total_new_clients')) {
        $commonData['total_new_clients'] = $totals['newClients'];
    }
    if ($hasColumn('total_fastweb')) {
        $commonData['total_fastweb'] = $totals['fastweb'];
    }
    if ($hasColumn('total_rush')) {
        $commonData['total_rush'] = $totals['rush'];
    }
    if ($hasColumn('file_data')) {
        $commonData['file_data'] = $fileDataJson;
    }
    if ($hasColumn('metadata')) {
        $commonData['metadata'] = $metadataJson;
    }
    if ($hasColumn('agents_data')) {
        $commonData['agents_data'] = $agentsJson;
    }
    if ($hasColumn('sm_ranking')) {
        $commonData['sm_ranking'] = $smRankingJson;
    }
    if ($hasColumn('upload_date')) {
        $commonData['upload_date'] = $now;
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare('SELECT id FROM uploaded_files WHERE file_date = ? LIMIT 1');
        $stmt->execute([$fileDate]);
        $existingId = $stmt->fetchColumn();

        if ($existingId) {
            $setParts = [];
            foreach ($commonData as $column => $_value) {
                $setParts[] = sprintf('%s = :%s', $column, $column);
            }

            $sql = 'UPDATE uploaded_files SET ' . implode(', ', $setParts) . ' WHERE id = :id';
            $updateStmt = $pdo->prepare($sql);

            foreach ($commonData as $column => $value) {
                $updateStmt->bindValue(':' . $column, $value);
            }
            $updateStmt->bindValue(':id', (int)$existingId, PDO::PARAM_INT);
            $updateStmt->execute();

            $action = 'updated';
        } else {
            $insertData = ['file_date' => $fileDate] + $commonData;

            $columnsSql = implode(', ', array_keys($insertData));
            $placeholders = implode(', ', array_map(function ($column) {
                return ':' . $column;
            }, array_keys($insertData)));

            $sql = sprintf('INSERT INTO uploaded_files (%s) VALUES (%s)', $columnsSql, $placeholders);
            $insertStmt = $pdo->prepare($sql);

            foreach ($insertData as $column => $value) {
                $insertStmt->bindValue(':' . $column, $value);
            }

            $insertStmt->execute();
            $action = 'created';
        }

        $pdo->commit();

        if ($action === 'created') {
            http_response_code(201);
        }

        echo json_encode(['success' => true, 'action' => $action]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Errore durante il salvataggio del file', 'details' => $e->getMessage()]);
    }
}
?>