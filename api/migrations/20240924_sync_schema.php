<?php

declare(strict_types=1);

if (!isset($pdo) || !($pdo instanceof PDO)) {
    throw new RuntimeException('Schema sync requires a valid PDO instance in $pdo');
}

/**
 * Determine whether a table exists in the current database.
 */
$tableExists = function (PDO $pdo, string $table): bool {
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?'
    );
    $stmt->execute([$table]);

    return (int) $stmt->fetchColumn() > 0;
};

/**
 * Ensure a column exists on the given table, adding it when missing.
 */
$ensureColumn = function (PDO $pdo, callable $tableExists, string $table, string $column, string $definition): void {
    if (!$tableExists($pdo, $table)) {
        return;
    }

    $checkStmt = $pdo->prepare(
        'SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $checkStmt->execute([$table, $column]);

    if ((int) $checkStmt->fetchColumn() === 0) {
        $sql = sprintf('ALTER TABLE %s ADD COLUMN %s', $table, $definition);
        $pdo->exec($sql);
    }
};

try {
    $migrations = [
        'users' => [
            'role' => "role VARCHAR(50) NOT NULL DEFAULT 'user'",
            'full_name' => 'full_name VARCHAR(255) NULL',
            'is_active' => 'is_active TINYINT(1) NOT NULL DEFAULT 1',
            'last_login' => 'last_login DATETIME NULL DEFAULT NULL',
            'created_at' => 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        ],
        'user_sessions' => [
            'ip_address' => 'ip_address VARCHAR(45) NULL DEFAULT NULL',
            'user_agent' => 'user_agent VARCHAR(255) NULL DEFAULT NULL',
            'expires_at' => 'expires_at DATETIME NOT NULL',
            'last_activity' => 'last_activity DATETIME NULL DEFAULT NULL',
            'created_at' => 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
        ],
        'uploaded_files' => [
            'display_date' => 'display_date VARCHAR(50) NULL',
            'file_size' => 'file_size BIGINT UNSIGNED NULL DEFAULT NULL',
            'uploaded_by' => 'uploaded_by INT UNSIGNED NULL DEFAULT NULL',
            'upload_date' => 'upload_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
            'total_agents' => 'total_agents INT UNSIGNED NOT NULL DEFAULT 0',
            'total_sms' => 'total_sms INT UNSIGNED NOT NULL DEFAULT 0',
            'total_revenue' => 'total_revenue DECIMAL(15,2) NOT NULL DEFAULT 0',
            'total_inflow' => 'total_inflow DECIMAL(15,2) NOT NULL DEFAULT 0',
            'total_new_clients' => 'total_new_clients INT UNSIGNED NOT NULL DEFAULT 0',
            'total_fastweb' => 'total_fastweb INT UNSIGNED NOT NULL DEFAULT 0',
            'agents_data' => 'agents_data LONGTEXT NULL',
            'sm_ranking' => 'sm_ranking LONGTEXT NULL',
            'metadata' => 'metadata LONGTEXT NULL',
        ],
        'activity_logs' => [
            'user_id' => 'user_id INT NULL DEFAULT NULL',
            'action' => 'action VARCHAR(100) NOT NULL',
            'description' => 'description TEXT NULL',
            'ip_address' => 'ip_address VARCHAR(45) NULL DEFAULT NULL',
            'created_at' => 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
        ],
    ];

    foreach ($migrations as $table => $columns) {
        foreach ($columns as $column => $definition) {
            $ensureColumn($pdo, $tableExists, $table, $column, $definition);
        }
    }
} catch (Throwable $e) {
    error_log('Schema sync failed: ' . $e->getMessage());
}
