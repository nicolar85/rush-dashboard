<?php
/**
 * Lightweight migration to ensure required columns exist on the users table.
 */

if (!isset($pdo) || !($pdo instanceof PDO)) {
    throw new RuntimeException('PDO connection not available for migration.');
}

try {
    $columnsStmt = $pdo->query('SHOW COLUMNS FROM `users`');
    $existingColumns = $columnsStmt->fetchAll(PDO::FETCH_COLUMN);
} catch (Throwable $e) {
    error_log('Failed to inspect users table columns: ' . $e->getMessage());
    return;
}

$alterStatements = [];

if (!in_array('full_name', $existingColumns, true)) {
    $alterStatements[] = "ADD COLUMN `full_name` VARCHAR(255) NULL AFTER `username`";
}

if (!in_array('role', $existingColumns, true)) {
    $alterStatements[] = "ADD COLUMN `role` VARCHAR(50) NOT NULL DEFAULT 'admin' AFTER `full_name`";
}

if (!in_array('is_active', $existingColumns, true)) {
    $alterStatements[] = "ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `role`";
}

if (!in_array('created_at', $existingColumns, true)) {
    $alterStatements[] = "ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `is_active`";
}

if (!in_array('updated_at', $existingColumns, true)) {
    $alterStatements[] = "ADD COLUMN `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`";
}

if (!in_array('last_login', $existingColumns, true)) {
    $alterStatements[] = "ADD COLUMN `last_login` DATETIME NULL DEFAULT NULL AFTER `updated_at`";
}

if (!empty($alterStatements)) {
    $sql = 'ALTER TABLE `users` ' . implode(', ', $alterStatements);

    try {
        $pdo->exec($sql);
    } catch (Throwable $e) {
        error_log('Failed to alter users table: ' . $e->getMessage());
        // Continue to attempt data backfill for columns that do exist now.
    }
}

// Refresh columns list after potential alterations to avoid race conditions.
try {
    $columnsStmt = $pdo->query('SHOW COLUMNS FROM `users`');
    $existingColumns = $columnsStmt->fetchAll(PDO::FETCH_COLUMN);
} catch (Throwable $e) {
    error_log('Failed to refresh users table columns: ' . $e->getMessage());
    return;
}

// Populate sensible defaults where data is missing.
try {
    if (in_array('full_name', $existingColumns, true)) {
        $pdo->exec("UPDATE `users` SET `full_name` = `username` WHERE (`full_name` IS NULL OR `full_name` = '') AND `username` IS NOT NULL");
    }

    if (in_array('role', $existingColumns, true)) {
        $pdo->exec("UPDATE `users` SET `role` = 'admin' WHERE `role` IS NULL OR `role` = ''");
    }

    if (in_array('is_active', $existingColumns, true)) {
        $pdo->exec("UPDATE `users` SET `is_active` = 1 WHERE `is_active` IS NULL");
    }

    if (in_array('created_at', $existingColumns, true)) {
        $pdo->exec("UPDATE `users` SET `created_at` = COALESCE(`created_at`, NOW())");
    }

    if (in_array('updated_at', $existingColumns, true)) {
        $pdo->exec("UPDATE `users` SET `updated_at` = COALESCE(`updated_at`, NOW())");
    }

    if (in_array('last_login', $existingColumns, true)) {
        $pdo->exec("UPDATE `users` SET `last_login` = COALESCE(`last_login`, `updated_at`, `created_at`, NOW())");
    }
} catch (Throwable $e) {
    error_log('Failed to backfill users table columns: ' . $e->getMessage());
}
