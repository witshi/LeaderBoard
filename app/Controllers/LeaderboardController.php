<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\DockerDatabaseUnavailableException;
use App\Services\LeaderboardService;
use App\Utils\Response;
use App\Utils\Validator;
use PDOException;
use Throwable;

final class LeaderboardController
{
    private LeaderboardService $service;
    private array $config;

    public function __construct(LeaderboardService $service, array $config)
    {
        $this->service = $service;
        $this->config = $config;
    }

    public function getScores(): void
    {
        $this->startSession();

        try {
            $scores = $this->service->getScores();
            Response::json([
                'success' => true,
                'data' => $scores,
            ]);
        } catch (DockerDatabaseUnavailableException $exception) {
            Response::json([
                'success' => false,
                'error' => $exception->getMessage(),
            ], 503);
        } catch (PDOException $exception) {
            Response::json([
                'success' => false,
                'error' => $exception->getMessage(),
            ], 500);
        } catch (Throwable $exception) {
            Response::json([
                'success' => false,
                'error' => 'Lỗi không xác định: ' . $exception->getMessage(),
            ], 500);
        }
    }

    public function postScore(): void
    {
        $this->startSession();

        $input = $this->getRequestData();
        $username = is_string($input['username'] ?? null) ? trim($input['username']) : ($input['username'] ?? null);
        $score = $input['score'] ?? null;
        $clientId = is_string($input['client_id'] ?? null) ? trim($input['client_id']) : '';

        $errors = [];

        $usernameError = Validator::validateUsername($username);
        if ($usernameError !== null) {
            $errors['username'] = $usernameError;
        }

        $scoreError = Validator::validateScore(
            $score,
            (int) $this->config['score']['min'],
            (int) $this->config['score']['max']
        );
        if ($scoreError !== null) {
            $errors['score'] = $scoreError;
        }

        if ($clientId === '' || mb_strlen($clientId) > 64) {
            $errors['client_id'] = 'Danh tính phiên không hợp lệ. Vui lòng tải lại trang rồi thử lại.';
        }

        if (!empty($errors)) {
            Response::json([
                'success' => false,
                'error' => 'Dữ liệu nhập không hợp lệ.',
                'details' => $errors,
            ], 422);
            return;
        }

        $username = (string) $username;
        $score = (int) $score;

        try {
            $existingPlayer = $this->service->getPlayerByUsername($username);
        } catch (DockerDatabaseUnavailableException $exception) {
            Response::json([
                'success' => false,
                'error' => $exception->getMessage(),
            ], 503);
            return;
        } catch (PDOException $exception) {
            Response::json([
                'success' => false,
                'error' => $exception->getMessage(),
            ], 500);
            return;
        }

        $ownerClientId = is_array($existingPlayer) ? (string) ($existingPlayer['owner_client_id'] ?? '') : '';
        if ($existingPlayer !== null && $ownerClientId !== '' && $ownerClientId !== $clientId) {
            Response::json([
                'success' => false,
                'error' => 'Username đã được phiên khác sử dụng. Vui lòng chọn tên khác.',
            ], 409);
            return;
        }

        $bucket = $_SESSION['last_score_update_at'] ?? [];
        $lastUpdatedAt = isset($bucket[$username]) ? (int) $bucket[$username] : 0;
        $rateLimitSeconds = (int) $this->config['rate_limit_seconds'];
        $elapsed = time() - $lastUpdatedAt;

        if ($lastUpdatedAt > 0 && $elapsed < $rateLimitSeconds) {
            $retryAfter = $rateLimitSeconds - $elapsed;
            Response::json([
                'success' => false,
                'error' => sprintf('Vui lòng đợi %d giây rồi thử lại.', $retryAfter),
                'retry_after' => $retryAfter,
            ], 429);
            return;
        }

        try {
            $this->service->upsertScore($username, $score, $clientId);
            $bucket[$username] = time();
            $_SESSION['last_score_update_at'] = $bucket;

            Response::json([
                'success' => true,
                'message' => 'Cập nhật điểm thành công.',
            ], 200);
        } catch (DockerDatabaseUnavailableException $exception) {
            Response::json([
                'success' => false,
                'error' => $exception->getMessage(),
            ], 503);
        } catch (PDOException $exception) {
            Response::json([
                'success' => false,
                'error' => $exception->getMessage(),
            ], 500);
        } catch (Throwable $exception) {
            Response::json([
                'success' => false,
                'error' => 'Lỗi không xác định: ' . $exception->getMessage(),
            ], 500);
        }
    }

    private function startSession(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    private function getRequestData(): array
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (str_contains($contentType, 'application/json')) {
            $raw = file_get_contents('php://input');
            $decoded = json_decode($raw ?: '{}', true);

            return is_array($decoded) ? $decoded : [];
        }

        return $_POST;
    }
}
