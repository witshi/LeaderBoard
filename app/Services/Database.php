<?php

declare(strict_types=1);

namespace App\Services;

use PDO;
use PDOException;
use RuntimeException;

final class DockerDatabaseUnavailableException extends RuntimeException
{
}

final class Database
{
    private array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function getConnection(): PDO
    {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            $this->config['host'],
            $this->config['port'],
            $this->config['name'],
            $this->config['charset']
        );

        try {
            return new PDO($dsn, $this->config['user'], $this->config['pass'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        } catch (PDOException $exception) {
            $message = $exception->getMessage();
            $looksLikeDockerDown = str_contains($message, 'Connection refused')
                || str_contains($message, 'SQLSTATE[HY000] [2002]')
                || str_contains($message, 'No such file or directory');

            if ($looksLikeDockerDown) {
                throw new DockerDatabaseUnavailableException(
                    'MySQL chưa sẵn sàng. Hãy kiểm tra Docker Desktop và container MySQL đang chạy.',
                    503,
                    $exception
                );
            }

            throw $exception;
        }
    }
}
