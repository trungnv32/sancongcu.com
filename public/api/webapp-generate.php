<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Phương thức không được hỗ trợ.']);
    exit;
}

$token = $_SERVER['HTTP_X_SUPABASE_AUTHORIZATION'] ?? '';
if (!is_string($token) || !str_starts_with($token, 'Bearer ')) {
    http_response_code(401);
    echo json_encode(['error' => 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.']);
    exit;
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => 'Máy chủ chưa sẵn sàng xử lý yêu cầu tạo ảnh.']);
    exit;
}

$body = [];
foreach ($_POST as $key => $value) {
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

if ($response === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Không thể kết nối dịch vụ tạo ảnh. Vui lòng thử lại.']);
    exit;
}

http_response_code($status ?: 502);
echo $response;
