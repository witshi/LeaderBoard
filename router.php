<?php

declare(strict_types=1);

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$root = __DIR__;

if ($uri === '/public' || $uri === '/public/') {
    header('Location: /', true, 302);
    exit;
}

if ($uri === '/' || $uri === '/index.html') {
    readfile($root . '/public/index.html');
    exit;
}

if (str_starts_with($uri, '/assets/')) {
    $file = realpath($root . '/public' . $uri);
    $publicRoot = realpath($root . '/public');

    if ($file !== false && $publicRoot !== false && str_starts_with($file, $publicRoot) && is_file($file)) {
        $ext = pathinfo($file, PATHINFO_EXTENSION);
        $types = [
            'css' => 'text/css; charset=utf-8',
            'js' => 'application/javascript; charset=utf-8',
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            'gif' => 'image/gif',
            'ico' => 'image/x-icon',
            'json' => 'application/json; charset=utf-8',
        ];

        if (isset($types[$ext])) {
            header('Content-Type: ' . $types[$ext]);
        }

        readfile($file);
        exit;
    }

    http_response_code(404);
    echo 'Not Found';
    exit;
}

if ($uri === '/api/get_scores.php') {
    require $root . '/api/get_scores.php';
    exit;
}

if ($uri === '/api/post_score.php') {
    require $root . '/api/post_score.php';
    exit;
}

if ($uri === '/api/delete_player.php') {
    require $root . '/api/delete_player.php';
    exit;
}

http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo 'Not Found';
