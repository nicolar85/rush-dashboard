<?php
/**
 * RUSH Dashboard API Backend
 * Gestisce autenticazione, upload file, e dati dashboard
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Error reporting per sviluppo
error_reporting(E_ALL);
ini_set('display_errors', 0); // Set to 0 in production
ini_set('log_errors', 1);

// ================================
// ⚠️ CONFIGURAZIONE DATABASE - CAMBIA QUI ⚠️
// ================================

/**
 * Recupera una variabile d'ambiente obbligatoria oppure termina con un errore leggibile.
 */
function requireEnv(string $key): string
{
    $value = getenv($key);

    if ($value === false || $value === '') {
        error_log("Missing required environment variable: {$key}");
        http_response_code(500);
        echo json_encode([
            'error' => 'Configurazione ambiente non valida',
            'details' => "Variabile {$key} non configurata"
        ]);
        exit;
    }

    return $value;
}

$config = [
    'host' => requireEnv('DB_HOST'),
    'dbname' => requireEnv('DB_NAME'),
    'username' => requireEnv('DB_USERNAME'),
    'password' => requireEnv('DB_PASSWORD'),
    'charset' => getenv('DB_CHARSET') ?: 'utf8mb4',
    'collation' => getenv('DB_COLLATION') ?: null,
];

$dsn = sprintf(
    'mysql:host=%s;dbname=%s;charset=%s',
    $config['host'],
    $config['dbname'],
    $config['charset']
);

$initCommand = $config['collation']
    ? sprintf('SET NAMES %s COLLATE %s', $config['charset'], $config['collation'])
    : sprintf('SET NAMES %s', $config['charset']);

// ================================
// CONNESSIONE DATABASE
// ================================
try {
    $pdo = new PDO(
        $dsn,
        $config['username'],
        $config['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => $initCommand
        ]
    );
} catch(PDOException $e) {
    error_log('Database connection failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Errore di connessione al database']);
    exit;
}

// ================================
// UTILITY FUNCTIONS
// ================================

function logActivity($pdo, $user_id, $action, $description, $ip = null) {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO activity_logs (user_id, action, description, ip_address) 
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$user_id, $action, $description, $ip ?: $_SERVER['REMOTE_ADDR'] ?? 'unknown']);
    } catch (Exception $e) {
        error_log("Failed to log activity: " . $e->getMessage());
    }
}

function validateSession($pdo, $token) {
    if (!$token) return false;
    
    try {
        $stmt = $pdo->prepare("
            SELECT u.id, u.username, u.role, u.full_name
            FROM users u 
            JOIN user_sessions s ON u.id = s.user_id 
            WHERE s.session_token = ? AND s.expires_at > NOW() AND u.is_active = 1
        ");
        $stmt->execute([$token]);
        $user = $stmt->fetch();
        
        if ($user) {
            // Aggiorna last_activity
            $updateStmt = $pdo->prepare("UPDATE user_sessions SET last_activity = NOW() WHERE session_token = ?");
            $updateStmt->execute([$token]);
        }
        
        return $user;
    } catch (Exception $e) {
        error_log("Session validation failed: " . $e->getMessage());
        return false;
    }
}

function requireAuth($pdo) {
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    
    // Rimuovi "Bearer " se presente
    $token = preg_replace('/^Bearer\s+/', '', $token);
    
    $user = validateSession($pdo, $token);
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Sessione non valida o scaduta']);
        exit;
    }
    
    return $user;
}

function respondWithError($code, $message, $details = null) {
    http_response_code($code);
    $response = ['error' => $message];
    if ($details && (error_reporting() & E_ALL)) { // Solo in sviluppo
        $response['details'] = $details;
    }
    echo json_encode($response);
    exit;
}

function respondWithSuccess($data = [], $message = null) {
    $response = ['success' => true];
    if ($message) $response['message'] = $message;
    if (!empty($data)) $response = array_merge($response, $data);
    echo json_encode($response);
    exit;
}

function enforceAdminAccess($pdo, $user, $action = 'ADMIN_ACTION_BLOCKED', $context = 'azione riservata') {
    $role = $user['role'] ?? 'sconosciuto';

    if ($role !== 'admin') {
        $username = $user['username'] ?? 'sconosciuto';
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

        logActivity(
            $pdo,
            $user['id'] ?? null,
            $action,
            sprintf(
                'Tentativo non autorizzato di %s da %s (ruolo: %s, IP: %s)',
                $context,
                $username,
                $role,
                $ip
            )
        );

        respondWithError(403, 'Accesso negato. Solo gli amministratori possono caricare o aggiornare file.');
    }
}

// ================================
// ROUTING
// ================================

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = array_filter(explode('/', trim($path, '/')));
$endpoint = end($pathParts);

// Rimuovi 'api' dal path se presente
if (($key = array_search('api', $pathParts)) !== false) {
    unset($pathParts[$key]);
    $pathParts = array_values($pathParts);
    $endpoint = end($pathParts);
}

try {
    switch ($method) {
        case 'GET':
            handleGetRequests($pdo, $pathParts, $endpoint);
            break;
            
        case 'POST':
            handlePostRequests($pdo, $pathParts, $endpoint);
            break;
            
        case 'PUT':
            handlePutRequests($pdo, $pathParts, $endpoint);
            break;
            
        case 'DELETE':
            handleDeleteRequests($pdo, $pathParts, $endpoint);
            break;
            
        default:
            respondWithError(405, 'Metodo non supportato');
    }
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    respondWithError(500, 'Errore interno del server');
}

// ================================
// GET HANDLERS
// ================================

function handleGetRequests($pdo, $pathParts, $endpoint) {
    switch ($endpoint) {
        case 'health':
            respondWithSuccess([
                'status' => 'ok',
                'timestamp' => time(),
                'version' => '1.0.0',
                'database' => 'connected'
            ]);
            break;
            
        case 'profile':          
            getUserProfile($pdo); 
            break;               
            
        case 'uploads':
            $user = requireAuth($pdo);
            getAllFiles($pdo, $user);
            break;
            
        case 'users':
            $user = requireAuth($pdo);
            getAllUsers($pdo, $user);
            break;
            
        default:
            // GET /api/file-data/{file_date} - Restituisce i dati completi di un file
            if (count($pathParts) >= 2 && $pathParts[count($pathParts)-2] === 'file-data') {
                $user = requireAuth($pdo);
                $fileDate = end($pathParts);
                getFileData($pdo, $user, $fileDate);
            } else {
                respondWithError(404, 'Endpoint non trovato');
            }
    }
}

// ================================
// POST HANDLERS - AGGIORNATO CON SUPPORTO CREAZIONE UTENTI
// ================================

function handlePostRequests($pdo, $pathParts, $endpoint) {
    switch ($endpoint) {
        case 'login':
            handleLogin($pdo);
            break;
            
        case 'logout':
            handleLogout($pdo);
            break;
            
        case 'upload':
            $user = requireAuth($pdo);
            enforceAdminAccess($pdo, $user, 'FILE_UPLOAD_BLOCKED', 'caricamento/aggiornamento file');
            handleFileUpload($pdo, $user);
            break;
            
        case 'users':  // ⭐ NUOVO: POST /api/users per creare utente
            $user = requireAuth($pdo);
            createUser($pdo, $user);
            break;
            
        default:
            respondWithError(404, 'Endpoint non trovato');
    }
}

// ================================
// PUT HANDLERS
// ================================

function handlePutRequests($pdo, $pathParts, $endpoint) {
    $user = requireAuth($pdo);
    
    // PUT /api/users/{userId}/password
    if (count($pathParts) >= 3 && $pathParts[count($pathParts)-3] === 'users' && 
        $pathParts[count($pathParts)-1] === 'password') {
        
        $userId = $pathParts[count($pathParts)-2];
        updateUserPassword($pdo, $user, $userId);
    }
    // PUT /api/users/{userId}/role  
    elseif (count($pathParts) >= 3 && $pathParts[count($pathParts)-3] === 'users' && 
            $pathParts[count($pathParts)-1] === 'role') {
        
        $userId = $pathParts[count($pathParts)-2];
        updateUserRole($pdo, $user, $userId);
    }
    else {
        respondWithError(404, 'Endpoint non trovato');
    }
}

// ================================
// DELETE HANDLERS - AGGIORNATO CON SUPPORTO ELIMINAZIONE UTENTI
// ================================

function handleDeleteRequests($pdo, $pathParts, $endpoint) {
    $user = requireAuth($pdo);
    
    // DELETE /api/uploads/{file_date}
    if (count($pathParts) >= 2 && $pathParts[count($pathParts)-2] === 'uploads') {
        deleteFile($pdo, $user, $endpoint);
    }
    // DELETE /api/users/{userId} - ⭐ NUOVO: Elimina utente
    elseif (count($pathParts) >= 2 && $pathParts[count($pathParts)-2] === 'users') {
        $userId = end($pathParts);
        deleteUser($pdo, $user, $userId);
    }
    else {
        respondWithError(404, 'Endpoint non trovato');
    }
}

// ================================
// AUTHENTICATION FUNCTIONS
// ================================

function handleLogin($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['username']) || !isset($input['password'])) {
        respondWithError(400, 'Username e password richiesti');
    }
    
    $username = trim($input['username']);
    $password = $input['password'];
    
    if (empty($username) || empty($password)) {
        respondWithError(400, 'Username e password non possono essere vuoti');
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT id, username, password_hash, role, full_name, last_login 
            FROM users 
            WHERE username = ? AND is_active = 1
        ");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password_hash'])) {
            // Genera token sessione
            $token = bin2hex(random_bytes(32));
            $expires = date('Y-m-d H:i:s', time() + (24 * 60 * 60)); // 24 ore
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
            
            // Rimuovi sessioni vecchie per questo utente
            $cleanupStmt = $pdo->prepare("DELETE FROM user_sessions WHERE user_id = ? AND expires_at < NOW()");
            $cleanupStmt->execute([$user['id']]);
            
            // Crea nuova sessione
            $sessionStmt = $pdo->prepare("
                INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at) 
                VALUES (?, ?, ?, ?, ?)
            ");
            $sessionStmt->execute([$user['id'], $token, $ip, $userAgent, $expires]);
            
            // Aggiorna ultimo login
            $updateStmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
            $updateStmt->execute([$user['id']]);
            
            // Log attività
            logActivity($pdo, $user['id'], 'LOGIN', "Login effettuato da IP: {$ip}");
            
            respondWithSuccess([
                'token' => $token,
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'role' => $user['role'],
                    'full_name' => $user['full_name'],
                    'last_login' => $user['last_login']
                ],
                'expires_at' => $expires
            ], 'Login effettuato con successo');
            
        } else {
            // Log tentativo fallito
            logActivity($pdo, null, 'LOGIN_FAILED', "Login fallito per username: {$username}");
            
            // Delay per prevenire brute force
            sleep(1);
            
            respondWithError(401, 'Credenziali non valide');
        }
    } catch (Exception $e) {
        error_log("Login error: " . $e->getMessage());
        respondWithError(500, 'Errore durante il login');
    }
}

function handleLogout($pdo) {
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token = preg_replace('/^Bearer\s+/', '', $token);
    
    if ($token) {
        try {
            // Trova utente prima di eliminare sessione
            $userStmt = $pdo->prepare("
                SELECT u.id, u.username FROM users u 
                JOIN user_sessions s ON u.id = s.user_id 
                WHERE s.session_token = ?
            ");
            $userStmt->execute([$token]);
            $user = $userStmt->fetch();
            
            // Elimina sessione
            $stmt = $pdo->prepare("DELETE FROM user_sessions WHERE session_token = ?");
            $stmt->execute([$token]);
            
            if ($user) {
                logActivity($pdo, $user['id'], 'LOGOUT', 'Logout effettuato');
            }
            
            respondWithSuccess([], 'Logout effettuato con successo');
        } catch (Exception $e) {
            error_log("Logout error: " . $e->getMessage());
            respondWithError(500, 'Errore durante il logout');
        }
    } else {
        respondWithError(400, 'Token non fornito');
    }
}

/**
 * Ottieni profilo utente (per ripristino sessione)
 * GET /api/profile
 */
function getUserProfile($pdo) {
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token = preg_replace('/^Bearer\s+/', '', $token);
    
    if (!$token) {
        respondWithError(401, 'Token di autorizzazione mancante');
    }
    
    try {
        $user = validateSession($pdo, $token);
        
        if (!$user) {
            respondWithError(401, 'Sessione non valida o scaduta');
        }
        
        // Restituisci i dati del profilo utente
        respondWithSuccess([
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role'],
                'full_name' => $user['full_name']
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Get profile error: " . $e->getMessage());
        respondWithError(500, 'Errore durante il recupero del profilo');
    }
}

// ================================
// ADMIN USER MANAGEMENT FUNCTIONS - COMPLETE
// ================================

/**
 * Ottieni tutti gli utenti (solo admin) - GET /api/users
 */
function getAllUsers($pdo, $user) {
    // Verifica che sia admin
    if ($user['role'] !== 'admin') {
        respondWithError(403, 'Accesso negato. Solo gli amministratori possono visualizzare gli utenti.');
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT id, username, full_name, role, is_active, created_at, last_login
            FROM users 
            ORDER BY created_at DESC
        ");
        
        $stmt->execute();
        $users = $stmt->fetchAll();
        
        respondWithSuccess(['users' => $users]);
        
    } catch (Exception $e) {
        error_log("Get users error: " . $e->getMessage());
        respondWithError(500, 'Errore nel caricamento degli utenti');
    }
}

/**
 * Crea un nuovo utente (solo admin) - POST /api/users
 */
function createUser($pdo, $currentUser) {
    // Verifica che sia admin
    if ($currentUser['role'] !== 'admin') {
        respondWithError(403, 'Accesso negato. Solo gli amministratori possono creare utenti.');
    }
    
    // Leggi dati JSON dal body
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        respondWithError(400, 'Dati utente mancanti');
    }
    
    // Validazione campi richiesti
    $requiredFields = ['username', 'password', 'full_name', 'role'];
    foreach ($requiredFields as $field) {
        if (!isset($input[$field]) || empty(trim($input[$field]))) {
            respondWithError(400, "Campo richiesto mancante: {$field}");
        }
    }
    
    $username = trim($input['username']);
    $password = $input['password'];
    $fullName = trim($input['full_name']);
    $role = trim($input['role']);
    
    // Validazione username (solo caratteri alfanumerici e underscore)
    if (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username)) {
        respondWithError(400, 'Username deve contenere solo lettere, numeri e underscore (3-20 caratteri)');
    }
    
    // Validazione password
    if (strlen($password) < 6) {
        respondWithError(400, 'La password deve essere di almeno 6 caratteri');
    }
    
    // Validazione ruolo
    $validRoles = ['admin', 'viewer'];
    if (!in_array($role, $validRoles)) {
        respondWithError(400, 'Ruolo non valido. Ruoli disponibili: ' . implode(', ', $validRoles));
    }
    
    try {
        // Controlla se username già esiste
        $checkStmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $checkStmt->execute([$username]);
        
        if ($checkStmt->fetch()) {
            respondWithError(400, 'Username già in uso. Scegli un username diverso.');
        }
        
        // Hash della password
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        // Inserisci nuovo utente
        $stmt = $pdo->prepare("
            INSERT INTO users (username, password_hash, full_name, role, is_active, created_at, updated_at) 
            VALUES (?, ?, ?, ?, 1, NOW(), NOW())
        ");
        
        $stmt->execute([$username, $hashedPassword, $fullName, $role]);
        $newUserId = $pdo->lastInsertId();
        
        // Log dell'operazione
        logActivity($pdo, $currentUser['id'], 'USER_CREATED', 
            "Creato nuovo utente: {$username} (ID: {$newUserId}) con ruolo {$role}");
        
        // Recupera i dati del nuovo utente creato
        $userStmt = $pdo->prepare("
            SELECT id, username, full_name, role, is_active, created_at 
            FROM users WHERE id = ?
        ");
        $userStmt->execute([$newUserId]);
        $newUser = $userStmt->fetch();
        
        respondWithSuccess([
            'user' => $newUser
        ], 'Utente creato con successo');
        
    } catch (Exception $e) {
        error_log("Create user error: " . $e->getMessage());
        respondWithError(500, 'Errore durante la creazione dell\'utente');
    }
}

/**
 * Aggiorna la password di un utente (solo admin) - PUT /api/users/{userId}/password
 */
function updateUserPassword($pdo, $currentUser, $userId) {
    // Verifica che sia admin
    if ($currentUser['role'] !== 'admin') {
        respondWithError(403, 'Accesso negato. Solo gli amministratori possono modificare le password.');
    }
    
    // Leggi dati JSON dal body
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['new_password'])) {
        respondWithError(400, 'La nuova password è obbligatoria');
    }
    
    $newPassword = trim($input['new_password']);
    
    // Validazione password
    if (strlen($newPassword) < 6) {
        respondWithError(400, 'La password deve essere di almeno 6 caratteri');
    }
    
    try {
        // Verifica che l'utente target esista
        $checkStmt = $pdo->prepare("SELECT id, username FROM users WHERE id = ?");
        $checkStmt->execute([$userId]);
        $targetUser = $checkStmt->fetch();
        
        if (!$targetUser) {
            respondWithError(404, 'Utente non trovato');
        }
        
        // Hash della nuova password
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        
        // Aggiorna la password nel database
        $stmt = $pdo->prepare("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$hashedPassword, $userId]);
        
        if ($stmt->rowCount() === 0) {
            respondWithError(400, 'Nessuna modifica effettuata');
        }
        
        // Log dell'operazione
        logActivity($pdo, $currentUser['id'], 'PASSWORD_CHANGED', 
            "Password cambiata per utente {$targetUser['username']} (ID: {$userId})");
        
        // Invalida tutte le sessioni dell'utente target (forza re-login)
        $invalidateStmt = $pdo->prepare("DELETE FROM user_sessions WHERE user_id = ?");
        $invalidateStmt->execute([$userId]);
        
        respondWithSuccess([
            'user_id' => $userId,
            'username' => $targetUser['username'],
            'updated_at' => date('Y-m-d H:i:s')
        ], 'Password aggiornata con successo');
        
    } catch (Exception $e) {
        error_log("Update password error: " . $e->getMessage());
        respondWithError(500, 'Errore durante l\'aggiornamento della password');
    }
}

/**
 * Aggiorna il ruolo di un utente (solo admin) - PUT /api/users/{userId}/role
 */
function updateUserRole($pdo, $currentUser, $userId) {
    // Verifica che sia admin
    if ($currentUser['role'] !== 'admin') {
        respondWithError(403, 'Accesso negato. Solo gli amministratori possono modificare i ruoli.');
    }
    
    // Leggi dati JSON dal body
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['role'])) {
        respondWithError(400, 'Il ruolo è obbligatorio');
    }
    
    $newRole = trim($input['role']);
    
    // Validazione ruolo
    $validRoles = ['admin', 'viewer'];
    if (!in_array($newRole, $validRoles)) {
        respondWithError(400, 'Ruolo non valido. Ruoli disponibili: ' . implode(', ', $validRoles));
    }
    
    try {
        // Verifica che l'utente target esista
        $checkStmt = $pdo->prepare("SELECT id, username, role FROM users WHERE id = ?");
        $checkStmt->execute([$userId]);
        $targetUser = $checkStmt->fetch();
        
        if (!$targetUser) {
            respondWithError(404, 'Utente non trovato');
        }
        
        // Impedisci di cambiare il proprio ruolo
        if ($userId == $currentUser['id']) {
            respondWithError(400, 'Non puoi modificare il tuo stesso ruolo');
        }
        
        // Aggiorna il ruolo
        $stmt = $pdo->prepare("UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$newRole, $userId]);
        
        if ($stmt->rowCount() === 0) {
            respondWithError(400, 'Nessuna modifica effettuata');
        }
        
        // Log dell'operazione
        logActivity($pdo, $currentUser['id'], 'ROLE_CHANGED', 
            "Ruolo cambiato per utente {$targetUser['username']} da '{$targetUser['role']}' a '{$newRole}'");
        
        respondWithSuccess([
            'user_id' => $userId,
            'username' => $targetUser['username'],
            'old_role' => $targetUser['role'],
            'new_role' => $newRole,
            'updated_at' => date('Y-m-d H:i:s')
        ], 'Ruolo aggiornato con successo');
        
    } catch (Exception $e) {
        error_log("Update role error: " . $e->getMessage());
        respondWithError(500, 'Errore durante l\'aggiornamento del ruolo');
    }
}

/**
 * Elimina un utente (solo admin) - DELETE /api/users/{userId}
 */
function deleteUser($pdo, $currentUser, $userId) {
    // Verifica che sia admin
    if ($currentUser['role'] !== 'admin') {
        respondWithError(403, 'Accesso negato. Solo gli amministratori possono eliminare utenti.');
    }
    
    // Validazione userId
    if (!is_numeric($userId) || $userId <= 0) {
        respondWithError(400, 'ID utente non valido');
    }
    
    try {
        // Verifica che l'utente target esista
        $checkStmt = $pdo->prepare("SELECT id, username, role FROM users WHERE id = ?");
        $checkStmt->execute([$userId]);
        $targetUser = $checkStmt->fetch();
        
        if (!$targetUser) {
            respondWithError(404, 'Utente non trovato');
        }
        
        // Impedisci di eliminare se stesso
        if ($userId == $currentUser['id']) {
            respondWithError(400, 'Non puoi eliminare il tuo stesso account');
        }
        
        // Impedisci di eliminare l'ultimo admin
        if ($targetUser['role'] === 'admin') {
            $adminCountStmt = $pdo->prepare("SELECT COUNT(*) as admin_count FROM users WHERE role = 'admin' AND is_active = 1");
            $adminCountStmt->execute();
            $adminCount = $adminCountStmt->fetch()['admin_count'];
            
            if ($adminCount <= 1) {
                respondWithError(400, 'Impossibile eliminare l\'ultimo amministratore del sistema');
            }
        }
        
        $pdo->beginTransaction();
        
        try {
            // Elimina tutte le sessioni dell'utente
            $deleteSessionsStmt = $pdo->prepare("DELETE FROM user_sessions WHERE user_id = ?");
            $deleteSessionsStmt->execute([$userId]);
            
            // Aggiorna i file caricati dall'utente per mantenere la cronologia
            $updateFilesStmt = $pdo->prepare("
                UPDATE uploaded_files 
                SET uploaded_by = NULL, 
                    file_name = CONCAT('[UTENTE ELIMINATO] ', file_name)
                WHERE uploaded_by = ?
            ");
            $updateFilesStmt->execute([$userId]);
            
            // Mantieni i log attività per audit (user_id può essere NULL)
            $updateLogsStmt = $pdo->prepare("UPDATE activity_logs SET user_id = NULL WHERE user_id = ?");
            $updateLogsStmt->execute([$userId]);
            
            // Elimina l'utente
            $deleteStmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $deleteStmt->execute([$userId]);
            
            if ($deleteStmt->rowCount() === 0) {
                throw new Exception('Nessun utente eliminato');
            }
            
            $pdo->commit();
            
            // Log dell'operazione
            logActivity($pdo, $currentUser['id'], 'USER_DELETED', 
                "Eliminato utente: {$targetUser['username']} (ID: {$userId})");
            
            respondWithSuccess([
                'user_id' => $userId,
                'username' => $targetUser['username'],
                'deleted_at' => date('Y-m-d H:i:s')
            ], 'Utente eliminato con successo');
            
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("Delete user error: " . $e->getMessage());
        respondWithError(500, 'Errore durante l\'eliminazione dell\'utente');
    }
}

// ================================
// FILE MANAGEMENT FUNCTIONS
// ================================

function getAllFiles($pdo, $user) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                uf.id, uf.file_name, uf.file_date, uf.display_date, 
                uf.file_size, uf.upload_date, uf.total_agents, 
                uf.total_sms, uf.total_revenue, uf.total_inflow,
                uf.total_new_clients, uf.total_fastweb,
                u.username as uploaded_by_name
            FROM uploaded_files uf
            JOIN users u ON uf.uploaded_by = u.id
            ORDER BY uf.upload_date DESC
        ");
        
        $stmt->execute();
        $files = $stmt->fetchAll();
        
        // Formatta le date e i numeri
        foreach ($files as &$file) {
            $file['file_size'] = (int) $file['file_size'];
            $file['total_agents'] = (int) $file['total_agents'];
            $file['total_sms'] = (int) $file['total_sms'];
            $file['total_revenue'] = (float) $file['total_revenue'];
            $file['total_inflow'] = (float) $file['total_inflow'];
            $file['total_new_clients'] = (int) $file['total_new_clients'];
            $file['total_fastweb'] = (int) $file['total_fastweb'];
        }
        
        respondWithSuccess([
            'files' => $files,
            'count' => count($files)
        ]);
        
    } catch (Exception $e) {
        error_log("Get files error: " . $e->getMessage());
        respondWithError(500, 'Errore nel caricamento dei file');
    }
}

function getFileData($pdo, $user, $fileDate) {
    try {
        $stmt = $pdo->prepare("
            SELECT agents_data, sm_ranking, metadata, file_name, display_date
            FROM uploaded_files 
            WHERE file_date = ?
        ");
        $stmt->execute([$fileDate]);
        $file = $stmt->fetch();
        
        if ($file) {
            respondWithSuccess([
                'file_name' => $file['file_name'],
                'display_date' => $file['display_date'],
                'agents' => json_decode($file['agents_data'], true),
                'smRanking' => json_decode($file['sm_ranking'], true),
                'metadata' => json_decode($file['metadata'], true)
            ]);
        } else {
            respondWithError(404, 'File non trovato');
        }
        
    } catch (Exception $e) {
        error_log("Get file data error: " . $e->getMessage());
        respondWithError(500, 'Errore nel caricamento dei dati del file');
    }
}

function handleFileUpload($pdo, $user) {
    enforceAdminAccess($pdo, $user, 'FILE_UPLOAD_BLOCKED', 'upload file (invocazione diretta)');

    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['fileData'])) {
            respondWithError(400, 'Dati del file mancanti');
        }
        
        $fileData = $input['fileData'];
        
        // Validazione campi richiesti
        $required = ['name', 'date', 'displayDate', 'size', 'data'];
        foreach ($required as $field) {
            if (!isset($fileData[$field])) {
                respondWithError(400, "Campo richiesto mancante: {$field}");
            }
        }
        
        // Estrai statistiche dai dati
        $agentsData = $fileData['data']['agents'] ?? [];
        $smRanking = $fileData['data']['smRanking'] ?? [];
        $totali = $fileData['data']['totali'] ?? [];
        
        $totalAgents = count($agentsData);
        $totalSMs = count($smRanking);
        $totalRevenue = $totali['fatturato'] ?? 0;
        $totalInflow = $totali['inflow'] ?? 0;
        $totalNewClients = $totali['nuoviClienti'] ?? 0;
        $totalFastweb = $totali['fastweb'] ?? 0;
        
        // Controlla se il file esiste già
        $checkStmt = $pdo->prepare("SELECT id, file_name FROM uploaded_files WHERE file_date = ?");
        $checkStmt->execute([$fileData['date']]);
        $existingFile = $checkStmt->fetch();
        
        $pdo->beginTransaction();
        
        try {
            if ($existingFile) {
                // Aggiorna file esistente
                $stmt = $pdo->prepare("
                    UPDATE uploaded_files 
                    SET file_name = ?, file_size = ?, total_agents = ?, 
                        total_sms = ?, total_revenue = ?, total_inflow = ?,
                        total_new_clients = ?, total_fastweb = ?,
                        agents_data = ?, sm_ranking = ?, metadata = ?, 
                        upload_date = NOW()
                    WHERE file_date = ?
                ");
                
                $stmt->execute([
                    $fileData['name'],
                    $fileData['size'],
                    $totalAgents,
                    $totalSMs,
                    $totalRevenue,
                    $totalInflow,
                    $totalNewClients,
                    $totalFastweb,
                    json_encode($agentsData),
                    json_encode($smRanking),
                    json_encode($fileData['metadata'] ?? null),
                    $fileData['date']
                ]);
                
                logActivity($pdo, $user['id'], 'FILE_UPDATE', 
                    "Aggiornato file {$fileData['name']} per periodo {$fileData['displayDate']}");
                
                $action = 'updated';
                $message = 'File aggiornato con successo';
                
            } else {
                // Inserisci nuovo file
                $stmt = $pdo->prepare("
                    INSERT INTO uploaded_files 
                    (file_name, file_date, display_date, file_size, uploaded_by,
                     total_agents, total_sms, total_revenue, total_inflow,
                     total_new_clients, total_fastweb, agents_data, sm_ranking, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                $stmt->execute([
                    $fileData['name'],
                    $fileData['date'],
                    $fileData['displayDate'],
                    $fileData['size'],
                    $user['id'],
                    $totalAgents,
                    $totalSMs,
                    $totalRevenue,
                    $totalInflow,
                    $totalNewClients,
                    $totalFastweb,
                    json_encode($agentsData),
                    json_encode($smRanking),
                    json_encode($fileData['metadata'] ?? null)
                ]);
                
                logActivity($pdo, $user['id'], 'FILE_UPLOAD', 
                    "Caricato nuovo file {$fileData['name']} per periodo {$fileData['displayDate']}");
                
                $action = 'created';
                $message = 'File caricato con successo';
            }
            
            $pdo->commit();
            
            respondWithSuccess([
                'action' => $action,
                'file_date' => $fileData['date'],
                'stats' => [
                    'total_agents' => $totalAgents,
                    'total_sms' => $totalSMs,
                    'total_revenue' => $totalRevenue,
                    'total_inflow' => $totalInflow,
                    'total_new_clients' => $totalNewClients,
                    'total_fastweb' => $totalFastweb
                ]
            ], $message);
            
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("File upload error: " . $e->getMessage());
        respondWithError(500, 'Errore durante il caricamento del file');
    }
}

function deleteFile($pdo, $user, $fileDate) {
    try {
        // Controlla se l'utente può eliminare (solo admin o proprietario)
        $checkStmt = $pdo->prepare("SELECT id, file_name, uploaded_by FROM uploaded_files WHERE file_date = ?");
        $checkStmt->execute([$fileDate]);
        $file = $checkStmt->fetch();
        
        if (!$file) {
            respondWithError(404, 'File non trovato');
        }
        
        // Solo admin o chi ha caricato può eliminare
        if ($user['role'] !== 'admin' && $file['uploaded_by'] != $user['id']) {
            respondWithError(403, 'Non hai i permessi per eliminare questo file');
        }
        
        $stmt = $pdo->prepare("DELETE FROM uploaded_files WHERE file_date = ?");
        $stmt->execute([$fileDate]);
        
        if ($stmt->rowCount() > 0) {
            logActivity($pdo, $user['id'], 'FILE_DELETE', 
                "Eliminato file {$file['file_name']} per periodo {$fileDate}");
            
            respondWithSuccess([], 'File eliminato con successo');
        } else {
            respondWithError(404, 'File non trovato');
        }
        
    } catch (Exception $e) {
        error_log("Delete file error: " . $e->getMessage());
        respondWithError(500, 'Errore durante l\'eliminazione del file');
    }
}

// ================================
// FALLBACK 404
// ================================
respondWithError(404, 'Endpoint non trovato: ' . $endpoint);

?>
