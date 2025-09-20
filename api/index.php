<?php
// RUSH Dashboard API - versione semplificata per debug
// Questa versione riduce i controlli per individuare la causa degli errori 500 durante l'accesso

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

$host = getenv('DB_HOST') ?: 'localhost';
$database = getenv('DB_NAME') ?: 'rush_dashboard';
$username = getenv('DB_USERNAME') ?: 'root';
$password = getenv('DB_PASSWORD') ?: '';
$charset = getenv('DB_CHARSET') ?: 'utf8mb4';

try {
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $host, $database, $charset);
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Connessione al database fallita',
        'details' => $e->getMessage(),
    ]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '', '/');
$segments = $path ? explode('/', $path) : [];

if (!empty($segments) && $segments[0] === 'api') {
    array_shift($segments);
}

$endpoint = $segments[0] ?? '';

try {
    if ($method === 'GET' && $endpoint === 'health') {
        echo json_encode([
            'status' => 'ok',
            'timestamp' => time(),
        ]);
        exit;
    }

    if ($method === 'POST' && $endpoint === 'login') {
        handleLogin($pdo);
    } elseif ($method === 'POST' && $endpoint === 'logout') {
        handleLogout($pdo);
    } elseif ($method === 'GET' && $endpoint === 'profile') {
        handleProfile($pdo);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint non trovato', 'endpoint' => $endpoint]);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Errore interno del server',
        'details' => $e->getMessage(),
    ]);
}

die();

function getJsonInput(): array
{
    $input = json_decode(file_get_contents('php://input'), true);
    return is_array($input) ? $input : [];
}

function getAuthorizationToken(): ?string
{
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $token = $headers['Authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? null;

    if (!$token) {
        return null;
    }

    return preg_replace('/^Bearer\s+/i', '', $token);
}

function handleLogin(PDO $pdo): void
{
    $input = getJsonInput();

    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';

    if ($username === '' || $password === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Username e password sono obbligatori']);
        return;
    }

    $stmt = $pdo->prepare('SELECT id, username, password_hash, role, full_name FROM users WHERE username = ? AND is_active = 1');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Credenziali non valide']);
        return;
    }

    $token = bin2hex(random_bytes(32));
    $expiresAt = (new DateTime('+2 hours'))->format('Y-m-d H:i:s');

    $pdo->prepare('DELETE FROM user_sessions WHERE user_id = ?')->execute([$user['id']]);
    $pdo->prepare('INSERT INTO user_sessions (user_id, session_token, expires_at, last_activity, created_at) VALUES (?, ?, ?, NOW(), NOW())')
        ->execute([$user['id'], $token, $expiresAt]);

    echo json_encode([
        'success' => true,
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'full_name' => $user['full_name'],
        ],
    ]);
}

function handleLogout(PDO $pdo): void
{
    $token = getAuthorizationToken();

    if (!$token) {
        http_response_code(400);
        echo json_encode(['error' => 'Token di sessione mancante']);
        return;
    }

    $pdo->prepare('DELETE FROM user_sessions WHERE session_token = ?')->execute([$token]);

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

    $stmt = $pdo->prepare('SELECT u.id, u.username, u.role, u.full_name FROM users u JOIN user_sessions s ON u.id = s.user_id WHERE s.session_token = ? AND s.expires_at > NOW()');
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Sessione non valida o scaduta']);
        return;
    }

    echo json_encode(['success' => true, 'user' => $user]);
}
