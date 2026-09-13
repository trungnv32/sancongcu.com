<?php
declare(strict_types=1);

header('Cache-Control: no-store');

$nativeNonce = $_POST['native_form'] ?? '';
function respond(array $payload, int $status = 200): never {
    global $nativeNonce;
    http_response_code($status);
    if (is_string($nativeNonce) && $nativeNonce !== '') {
        header('Content-Type: text/html; charset=utf-8');
        $message = json_encode(
            ['source' => 'webapp-generate', 'nonce' => $nativeNonce, 'data' => $payload],
            JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE,
        );
        echo '<!doctype html><script>window.parent.postMessage(' . $message . ', window.location.origin)</script>';
        exit;
    }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    respond(['error' => 'Phương thức không được hỗ trợ.'], 405);
}

$token = $_POST['session_token'] ?? '';
if (!is_string($token) || !str_starts_with($token, 'Bearer ')) {
    http_response_code(401);
    respond(['error' => 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'], 401);
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    respond(['error' => 'Máy chủ chưa sẵn sàng xử lý yêu cầu tạo ảnh.'], 500);
}

$body = [];
foreach ($_POST as $key => $value) {
    if ($key === 'session_token') continue;
    $body[$key] = is_array($value) ? reset($value) : $value;
}

function add_uploads(string $field, array $upload, array &$body): void {
    $names = is_array($upload['name']) ? $upload['name'] : [$upload['name']];
    $tmpNames = is_array($upload['tmp_name']) ? $upload['tmp_name'] : [$upload['tmp_name']];
    $types = is_array($upload['type']) ? $upload['type'] : [$upload['type']];
    $errors = is_array($upload['error']) ? $upload['error'] : [$upload['error']];
    foreach ($names as $index => $name) {
        if (($errors[$index] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) continue;
        $key = count($names) > 1 ? $field . '[' . $index . ']' : $field;
        $body[$key] = new CURLFile($tmpNames[$index], $types[$index] ?: 'application/octet-stream', $name);
    }
}

if (isset($_FILES['images'])) add_uploads('images', $_FILES['images'], $body);
if (isset($_FILES['logo'])) add_uploads('logo', $_FILES['logo'], $body);

$request = curl_init('https://hxcucycjemuudlvaxhdk.supabase.co/functions/v1/webapp-generate');
curl_setopt_array($request, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $body,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 90,
    CURLOPT_HTTPHEADER => [
        'Authorization: ' . $token,
        'apikey: sb_publishable_5i2cKVLcW3jcq8JKJclBqw_1VMgRfO4',
        'X-Client-Info: sancongcu-hostinger-relay',
    ],
]);
$response = curl_exec($request);
$status = (int) curl_getinfo($request, CURLINFO_RESPONSE_CODE);
curl_close($request);

if ($response === false) respond(['error' => 'Không thể kết nối dịch vụ tạo ảnh. Vui lòng thử lại.'], 502);

$payload = json_decode($response, true);
if (!is_array($payload)) $payload = ['error' => 'Dịch vụ tạo ảnh trả về dữ liệu không hợp lệ.'];
respond($payload, $status ?: 502);
