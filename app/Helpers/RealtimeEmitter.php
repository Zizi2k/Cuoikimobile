<?php

namespace App\Helpers;

/**
 * Helper to emit realtime events from PHP backend to Socket.IO service.
 */
class RealtimeEmitter
{
    private static function getRealtimeUrl(): string
    {
        return getenv('QLPT_REALTIME_URL') ?: 'http://127.0.0.1:3001/api/emit';
    }

    private static function getRealtimeSecret(): string
    {
        return getenv('QLPT_REALTIME_SECRET') ?: '';
    }

    /**
     * Emit an event to a specific room or globally.
     *
     * @param string $event Event name, e.g. 'incident:created'
     * @param array $data Event data payload
     * @param string|null $room Room name, e.g. 'admin', 'user_2', or null for global
     * @return bool True if successfully dispatched
     */
    public static function emit(string $event, array $data = [], ?string $room = null): bool
    {
        $payload = json_encode([
            'event' => $event,
            'room'  => $room,
            'data'  => $data
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $url = self::getRealtimeUrl();
        $secret = self::getRealtimeSecret();
        if (strlen($secret) < 32) {
            error_log('Realtime disabled: configure QLPT_REALTIME_SECRET (at least 32 characters).');
            return false;
        }

        // Use cURL with a low timeout to prevent blocking normal HTTP responses
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => $payload,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER     => [
                    'Content-Type: application/json',
                    'x-realtime-secret: ' . $secret
                ],
                CURLOPT_TIMEOUT_MS     => 1000,
                CURLOPT_CONNECTTIMEOUT_MS => 500
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            return ($httpCode >= 200 && $httpCode < 300);
        }

        // Fallback using stream context
        $opts = [
            'http' => [
                'method'  => 'POST',
                'header'  => "Content-Type: application/json\r\nx-realtime-secret: {$secret}\r\n",
                'content' => $payload,
                'timeout' => 1.0
            ]
        ];

        $context = stream_context_create($opts);
        $result = @file_get_contents($url, false, $context);
        return $result !== false;
    }
}
