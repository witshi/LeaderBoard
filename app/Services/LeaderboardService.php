<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

final class LeaderboardService
{
    private Database $database;
    private bool $schemaChecked = false;

    public function __construct(Database $database)
    {
        $this->database = $database;
    }

    public function getScores(): array
    {
        $this->ensureSchema();
        $pdo = $this->database->getConnection();
        $statement = $pdo->query(
            'SELECT id, username, score, score_achieved_at
             FROM leaderboard
             ORDER BY score DESC, score_achieved_at ASC, id ASC, username ASC'
        );

        return $statement->fetchAll();
    }

    public function upsertScore(string $username, int $score, string $ownerClientId): void
    {
        $this->ensureSchema();
        $pdo = $this->database->getConnection();
        $sql = 'INSERT INTO leaderboard (username, score, owner_client_id)
                VALUES (:username, :score, :owner_client_id)
                ON DUPLICATE KEY UPDATE
                    score = VALUES(score),
                    owner_client_id = COALESCE(owner_client_id, VALUES(owner_client_id)),
                    score_achieved_at = CASE
                        WHEN score <> VALUES(score) THEN CURRENT_TIMESTAMP
                        ELSE score_achieved_at
                    END';

        $statement = $pdo->prepare($sql);
        $statement->execute([
            ':username' => $username,
            ':score' => $score,
            ':owner_client_id' => $ownerClientId,
        ]);
    }

    public function getPlayerByUsername(string $username): ?array
    {
        $this->ensureSchema();
        $pdo = $this->database->getConnection();
        $statement = $pdo->prepare(
            'SELECT score, owner_client_id, score_achieved_at
             FROM leaderboard
             WHERE username = :username
             LIMIT 1'
        );
        $statement->execute([':username' => $username]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public function deletePlayerByUsername(string $username): int
    {
        $this->ensureSchema();
        $pdo = $this->database->getConnection();
        $statement = $pdo->prepare('DELETE FROM leaderboard WHERE username = :username');
        $statement->execute([':username' => $username]);

        return $statement->rowCount();
    }

    private function ensureSchema(): void
    {
        if ($this->schemaChecked) {
            return;
        }

        $pdo = $this->database->getConnection();

        $checkStmt = $pdo->query(
            "SELECT COUNT(*) AS total
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'leaderboard'
               AND COLUMN_NAME = 'score_achieved_at'"
        );
        $exists = (int) ($checkStmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0) > 0;

        if (!$exists) {
            $pdo->exec('ALTER TABLE leaderboard ADD COLUMN score_achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER score');
        }

        $ownerCheckStmt = $pdo->query(
            "SELECT COUNT(*) AS total
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'leaderboard'
               AND COLUMN_NAME = 'owner_client_id'"
        );
        $ownerExists = (int) ($ownerCheckStmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0) > 0;

        if (!$ownerExists) {
            $pdo->exec('ALTER TABLE leaderboard ADD COLUMN owner_client_id VARCHAR(64) NULL AFTER username');
        }

        $this->schemaChecked = true;
    }
}
