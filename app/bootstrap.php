<?php

declare(strict_types=1);

use App\Controllers\LeaderboardController;
use App\Services\Database;
use App\Services\LeaderboardService;

require_once __DIR__ . '/Config/config.php';
require_once __DIR__ . '/Utils/Response.php';
require_once __DIR__ . '/Utils/Validator.php';
require_once __DIR__ . '/Services/Database.php';
require_once __DIR__ . '/Services/LeaderboardService.php';
require_once __DIR__ . '/Controllers/LeaderboardController.php';

$config = require __DIR__ . '/Config/config.php';

$database = new Database($config['db']);
$service = new LeaderboardService($database);
$controller = new LeaderboardController($service, $config);
