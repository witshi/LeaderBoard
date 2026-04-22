<?php

declare(strict_types=1);

namespace App\Utils;

final class Validator
{
    public static function validateUsername(mixed $username): ?string
    {
        if (!is_string($username)) {
            return 'Username phải là chuỗi.';
        }

        $trimmed = trim($username);
        if ($trimmed === '') {
            return 'Username không được để trống.';
        }

        if (mb_strlen($trimmed) > 50) {
            return 'Username tối đa 50 ký tự.';
        }

        return null;
    }

    public static function validateScore(mixed $score, int $min, int $max): ?string
    {
        if (is_string($score) && trim($score) === '') {
            return 'Điểm số không được để trống.';
        }

        if (filter_var($score, FILTER_VALIDATE_INT) === false) {
            return 'Điểm số phải là số nguyên.';
        }

        $intScore = (int) $score;
        if ($intScore < $min || $intScore > $max) {
            return sprintf('Điểm số phải nằm trong khoảng %d đến %d.', $min, $max);
        }

        return null;
    }
}
