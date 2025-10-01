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

        case 'upload-file':
            if ($method === 'POST') {
                handleFileUploadWithBinary($pdo);
            }
            break;
            
        case 'file-data':
            if ($method === 'GET') {
                handleFileData($pdo);
            }
            break;
        
        case 'users':
            if ($method === 'GET') {
                handleGetUsers($pdo);
            } elseif ($method === 'POST') {
                handleCreateUser($pdo);
            } elseif ($method === 'PUT' && !empty($segments[1])) {
                $userId = $segments[1];
                if (!empty($segments[2]) && $segments[2] === 'role') {
                    handleUpdateUserRole($pdo, $userId);
                } elseif (!empty($segments[2]) && $segments[2] === 'password') {
                    handleAdminUpdatePassword($pdo, $userId);
                }
            } elseif ($method === 'DELETE' && !empty($segments[1])) {
                handleDeleteUser($pdo, $segments[1]);
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

function requireAdminAuth(PDO $pdo): array
{
    $token = getAuthorizationToken();
    
    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Token di autenticazione mancante']);
        exit;
    }
    
    $stmt = $pdo->prepare(
        'SELECT u.id, u.username, u.role, u.is_active 
         FROM users u 
         JOIN user_sessions s ON u.id = s.user_id 
         WHERE s.session_token = ? AND s.expires_at > NOW()'
    );
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Token non valido o sessione scaduta']);
        exit;
    }
    
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Accesso negato. Solo gli amministratori possono gestire gli utenti.']);
        exit;
    }
    
    return $user;
}

function handleGetUsers(PDO $pdo): void
{
    requireAdminAuth($pdo);
    
    $stmt = $pdo->query(
        'SELECT id, username, role, is_active, created_at 
         FROM users 
         ORDER BY username ASC'
    );
    $users = $stmt->fetchAll();
    
    echo json_encode(['users' => $users]);
}

function handleCreateUser(PDO $pdo): void
{
    requireAdminAuth($pdo);
    
    $input = getJsonInput();
    $username = trim($input['username'] ?? '');
    $password = trim($input['password'] ?? '');
    $role = trim($input['role'] ?? 'viewer');
    
    if ($username === '' || $password === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Username e password sono obbligatori']);
        return;
    }
    
    if (!in_array($role, ['admin', 'viewer'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Ruolo non valido']);
        return;
    }
    
    // Verifica se username esiste già
    $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'Username già esistente']);
        return;
    }
    
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    
    $stmt = $pdo->prepare(
        'INSERT INTO users (username, password, role, is_active, created_at) 
         VALUES (?, ?, ?, 1, NOW())'
    );
    $stmt->execute([$username, $passwordHash, $role]);
    
    $userId = $pdo->lastInsertId();
    
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $userId,
            'username' => $username,
            'role' => $role,
            'is_active' => 1
        ]
    ]);
}

function handleUpdateUserRole(PDO $pdo, $userId): void
{
    requireAdminAuth($pdo);
    
    $input = getJsonInput();
    $role = trim($input['role'] ?? '');
    
    if (!in_array($role, ['admin', 'viewer'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Ruolo non valido']);
        return;
    }
    
    $stmt = $pdo->prepare('SELECT id FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Utente non trovato']);
        return;
    }
    
    $stmt = $pdo->prepare('UPDATE users SET role = ? WHERE id = ?');
    $stmt->execute([$role, $userId]);
    
    echo json_encode(['success' => true, 'message' => 'Ruolo aggiornato con successo']);
}

function handleAdminUpdatePassword(PDO $pdo, $userId): void
{
    requireAdminAuth($pdo);
    
    $input = getJsonInput();
    $newPassword = trim($input['new_password'] ?? '');
    
    if ($newPassword === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'La nuova password è obbligatoria']);
        return;
    }
    
    $stmt = $pdo->prepare('SELECT id FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Utente non trovato']);
        return;
    }
    
    $passwordHash = password_hash($newPassword, PASSWORD_BCRYPT);
    
    $stmt = $pdo->prepare('UPDATE users SET password = ? WHERE id = ?');
    $stmt->execute([$passwordHash, $userId]);
    
    echo json_encode(['success' => true, 'message' => 'Password aggiornata con successo']);
}

function handleDeleteUser(PDO $pdo, $userId): void
{
    requireAdminAuth($pdo);
    
    // Verifica che l'utente esista
    $stmt = $pdo->prepare('SELECT id, username FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Utente non trovato']);
        return;
    }
    
    // Elimina prima le sessioni dell'utente
    $stmt = $pdo->prepare('DELETE FROM user_sessions WHERE user_id = ?');
    $stmt->execute([$userId]);
    
    // Elimina l'utente
    $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    
    echo json_encode(['success' => true, 'message' => 'Utente eliminato con successo']);
}

// Funzione con logging dettagliato per debug
function handleFileUploadWithBinary(PDO $pdo): void
{
    error_log("=== INIZIO handleFileUploadWithBinary ===");
    
    try {
        $token = getAuthorizationToken();
if (!$token) {
    error_log("Errore: token mancante");
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Token di autenticazione mancante']);
    return;
}

$stmt = $pdo->prepare(
    'SELECT u.id, u.username, u.role FROM users u 
     JOIN user_sessions s ON u.id = s.user_id 
     WHERE s.session_token = ? AND s.expires_at > NOW()'
);
$stmt->execute([$token]);
$user = $stmt->fetch();

if (!$user) {
    error_log("Errore: token non valido");
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Token non valido o sessione scaduta']);
    return;
}

error_log("User autenticato: " . $user['username']);
        
        // Solo admin possono caricare file
        if ($user['role'] !== 'admin') {
            error_log("Errore: utente non admin");
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Accesso negato']);
            return;
        }

        // Verifica che ci sia un file
        if (!isset($_FILES['file'])) {
            error_log("Errore: nessun file in $_FILES");
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Nessun file caricato']);
            return;
        }
        
        $uploadError = $_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE;
        if ($uploadError !== UPLOAD_ERR_OK) {
            error_log("Errore upload file: " . $uploadError);
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Errore durante upload: ' . $uploadError]);
            return;
        }

        error_log("File ricevuto: " . $_FILES['file']['name']);

        // Recupera i dati parsati dal frontend
        $parsedDataJson = $_POST['data'] ?? null;
        if (!$parsedDataJson) {
            error_log("Errore: dati mancanti in POST");
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Dati mancanti']);
            return;
        }

        error_log("Lunghezza JSON ricevuto: " . strlen($parsedDataJson));

        $parsedData = json_decode($parsedDataJson, true);
        if (!$parsedData) {
            error_log("Errore: JSON decode fallito - " . json_last_error_msg());
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Formato dati non valido: ' . json_last_error_msg()]);
            return;
        }

        if (!isset($parsedData['metadata'])) {
            error_log("Errore: metadata mancante. Keys disponibili: " . implode(', ', array_keys($parsedData)));
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Metadata mancante']);
            return;
        }

        error_log("Metadata presente");

        // Estrai informazioni dal file
        $uploadedFile = $_FILES['file'];
        $fileName = $uploadedFile['name'];
        $fileSize = $uploadedFile['size'];
        
        error_log("File name: $fileName, size: $fileSize");
        
        // Estrai metadata
        $metadata = $parsedData['metadata'];
        $dateInfo = $metadata['dateInfo'] ?? null;
        
        if (!$dateInfo) {
            error_log("Errore: dateInfo mancante. Metadata keys: " . implode(', ', array_keys($metadata)));
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'dateInfo mancante in metadata']);
            return;
        }
        
        $fileDate = $dateInfo['dateString'] ?? date('Y-m-d');
        $displayDate = ($dateInfo['month'] ?? date('m')) . '/' . ($dateInfo['year'] ?? date('Y'));
        
        error_log("File date: $fileDate, display: $displayDate");
        
        // Prepara dati per il database
        // Il parser restituisce 'agents' e 'smData', non 'agenti' e 'coordinatori'
        $agentsData = $parsedData['agents'] ?? [];
        $smRanking = $parsedData['smData'] ?? [];
        
        error_log("Agents count: " . count($agentsData) . ", SM count: " . count($smRanking));
        
        $totalAgents = (int)($metadata['totalAgents'] ?? 0);
        $totalSMs = (int)($metadata['totalSMs'] ?? 0);
        $totalRevenue = (float)($metadata['totalRevenue'] ?? 0);
        $totalRush = (float)($metadata['totalRush'] ?? 0);
        $totalInflow = (float)($metadata['totalInflow'] ?? $totalRush);
        $totalNewClients = (int)($metadata['totalNewClients'] ?? 0);
        $totalFastweb = (int)($metadata['totalFastweb'] ?? 0);
        
        error_log("Totali: agents=$totalAgents, sms=$totalSMs, revenue=$totalRevenue, rush=$totalRush");
        
        // Serializza dati
        // Mantieni la struttura originale del parser per il campo file_data
        $fileDataForDb = [
            'agents' => $agentsData,
            'smData' => $smRanking,
            'metadata' => $metadata
        ];
        
        $agentsJson = json_encode($agentsData, JSON_UNESCAPED_UNICODE);
        $smRankingJson = json_encode($smRanking, JSON_UNESCAPED_UNICODE);
        $metadataJson = json_encode($metadata, JSON_UNESCAPED_UNICODE);
        $fileDataJson = json_encode($fileDataForDb, JSON_UNESCAPED_UNICODE);
        
        // Verifica serializzazione
        foreach ([
            'agents_data' => $agentsJson,
            'sm_ranking' => $smRankingJson,
            'metadata' => $metadataJson,
            'file_data' => $fileDataJson,
        ] as $key => $encoded) {
            if ($encoded === false) {
                error_log("Errore serializzazione: $key");
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => "Impossibile serializzare {$key}"]);
                return;
            }
        }
        
        error_log("Serializzazione completata");
        
        $pdo->beginTransaction();
        error_log("Transazione iniziata");
        
        try {
            // Controlla se esiste già un file con questa data
            $lookup = $pdo->prepare('SELECT id FROM uploaded_files WHERE file_date = ? LIMIT 1');
            $lookup->execute([$fileDate]);
            $existingId = $lookup->fetchColumn();
            
            if ($existingId) {
                error_log("File esistente trovato, ID: $existingId - aggiornamento");
                
                // Aggiorna file esistente
                $stmt = $pdo->prepare(
                    'UPDATE uploaded_files SET 
                        file_name = ?, 
                        display_date = ?, 
                        file_size = ?, 
                        upload_date = NOW(), 
                        uploaded_by = ?, 
                        agents_data = ?, 
                        sm_ranking = ?, 
                        metadata = ?, 
                        file_data = ?, 
                        total_agents = ?, 
                        total_sms = ?, 
                        total_revenue = ?, 
                        total_inflow = ?, 
                        total_new_clients = ?, 
                        total_fastweb = ?, 
                        total_rush = ? 
                    WHERE id = ?'
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
                error_log("File aggiornato con successo");
            } else {
                error_log("Nessun file esistente - creazione nuovo record");
                
                // Crea nuovo record
                $stmt = $pdo->prepare(
                    'INSERT INTO uploaded_files 
                    (file_date, file_name, display_date, file_size, upload_date, uploaded_by, 
                    agents_data, sm_ranking, metadata, file_data, total_agents, total_sms, 
                    total_revenue, total_inflow, total_new_clients, total_fastweb, total_rush) 
                    VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
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
                error_log("File creato con successo");
            }
            
            $pdo->commit();
            error_log("Transazione committata");
            
            echo json_encode(['success' => true, 'action' => $action]);
            error_log("=== FINE handleFileUploadWithBinary (SUCCESS) ===");
        } catch (Throwable $e) {
            $pdo->rollBack();
            error_log("Errore durante commit: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            http_response_code(500);
            echo json_encode([
                'success' => false, 
                'error' => 'Salvataggio file non riuscito', 
                'details' => $e->getMessage()
            ]);
        }
    } catch (Throwable $e) {
        error_log("Errore generale: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'error' => 'Errore interno del server', 
            'details' => $e->getMessage()
        ]);
    }
}
?>