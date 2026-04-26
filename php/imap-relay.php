<?php
/**
 * CafeQR Pro — IMAP Relay (drop-in companion to the existing send.php).
 *
 * Why: some PaaS networks block outbound 993, so the Next.js app can't reach
 * Gmail's IMAP server directly. This relay runs on a regular shared host
 * (where outbound IMAP works) and proxies the search/fetch for us.
 *
 * Drop this file next to your send.php at the same domain
 *   e.g.  https://ott24x7.com/mailer/imap.php
 * Then set IMAP_RELAY_URL in the Next.js app's env to that URL. The app
 * uses it only as a fallback when its own direct IMAP connection fails.
 *
 * Requires the PHP `imap` extension (php-imap). Most cPanel hosts have it.
 *
 * Auth: optional shared secret. Set IMAP_RELAY_KEY in your hosting env, the
 * same value also goes into the Next.js env. Leave both empty to disable.
 *
 * Request:
 *   POST application/json
 *   {
 *     "user":     "ott24x7@gmail.com",
 *     "pass":     "<gmail app password>",
 *     "since":    "2026-04-26T00:00:00Z",
 *     "senders":  ["no-reply@paytm.com", ...],   // optional, defaults to a built-in list
 *     "subjects": ["paid", "received", ...],      // optional, defaults likewise
 *     "limit":    50                              // optional, default 50, capped at 200
 *   }
 *
 * Response:
 *   {
 *     "ok": true,
 *     "inboxCount": 1234,
 *     "matchedCount": 7,
 *     "messages": [
 *       { "uid": "12345", "from": "alerts@hdfcbank.net", "subject": "...",
 *         "date": "2026-04-26T12:34:56Z", "body": "<plain-text body>" },
 *       ...
 *     ]
 *   }
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Api-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'POST only']);
    exit;
}

// Optional shared-secret auth.
$expectedKey = getenv('IMAP_RELAY_KEY') ?: '';
if ($expectedKey !== '') {
    $sentKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
    if (!hash_equals($expectedKey, $sentKey)) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'unauthorized']);
        exit;
    }
}

if (!function_exists('imap_open')) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'PHP imap extension not installed on this host']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid JSON body']);
    exit;
}

$user = $body['user'] ?? '';
$pass = $body['pass'] ?? '';
if ($user === '' || $pass === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'user/pass required']);
    exit;
}

$DEFAULT_SENDERS = [
    'no-reply@paytm.com', 'noreply@paytm.com', 'business@paytm.com',
    'no-reply@phonepe.com', 'noreply@phonepe.com',
    'googlepay-noreply@google.com',
    'alerts@hdfcbank.net', 'alerts@axisbank.com',
    'donotreply.sbiatm@alerts.sbi.co.in', 'alerts@icicibank.com',
];
$DEFAULT_SUBJECTS = ['paid', 'received', 'deposit', 'credit'];

$senders = (isset($body['senders']) && is_array($body['senders']) && count($body['senders']) > 0)
    ? array_values(array_filter($body['senders'], 'is_string'))
    : $DEFAULT_SENDERS;
$subjects = (isset($body['subjects']) && is_array($body['subjects']) && count($body['subjects']) > 0)
    ? array_values(array_filter($body['subjects'], 'is_string'))
    : $DEFAULT_SUBJECTS;

$sinceTs = isset($body['since']) ? strtotime($body['since']) : (time() - 24 * 3600);
if ($sinceTs === false) $sinceTs = time() - 24 * 3600;
$sinceImap = date('d-M-Y', $sinceTs);

$limit = isset($body['limit']) ? (int) $body['limit'] : 50;
if ($limit < 1) $limit = 50;
if ($limit > 200) $limit = 200;

$mailbox = '{imap.gmail.com:993/imap/ssl}INBOX';

// Suppress imap warning printout — we'll surface them in JSON.
$prevHandler = set_error_handler(function ($errno, $errstr) { /* swallow */ });
$conn = @imap_open($mailbox, $user, $pass, OP_READONLY);
if ($prevHandler) set_error_handler($prevHandler);

if (!$conn) {
    $errs = imap_errors();
    http_response_code(502);
    echo json_encode([
        'ok' => false,
        'error' => 'IMAP connect failed',
        'imapErrors' => is_array($errs) ? array_slice($errs, 0, 3) : [],
    ]);
    exit;
}

$inboxCount = imap_num_msg($conn);
$uids = [];

// IMAP SEARCH is AND across criteria. Run sender × subject and union.
foreach ($senders as $from) {
    foreach ($subjects as $subj) {
        $criteria = sprintf(
            'SINCE "%s" FROM "%s" SUBJECT "%s"',
            addslashes($sinceImap),
            addslashes($from),
            addslashes($subj)
        );
        $found = imap_search($conn, $criteria, SE_UID);
        if (is_array($found)) {
            foreach ($found as $u) $uids[$u] = true;
        }
    }
}

$uniqueUids = array_keys($uids);
sort($uniqueUids);
$matchedCount = count($uniqueUids);
$tail = array_slice($uniqueUids, -$limit);

$messages = [];
foreach ($tail as $uid) {
    $headerObj = imap_rfc822_parse_headers(imap_fetchheader($conn, $uid, FT_UID));
    $from = '';
    if (isset($headerObj->from) && is_array($headerObj->from) && count($headerObj->from) > 0) {
        $h = $headerObj->from[0];
        $from = ($h->mailbox ?? '') . '@' . ($h->host ?? '');
    }
    $subject = '';
    if (isset($headerObj->subject)) {
        $subject = imap_utf8($headerObj->subject);
    }
    $dateStr = isset($headerObj->date) ? date('c', strtotime($headerObj->date)) : null;

    // Try to grab a plain-text representation. imap_fetchbody with section "1"
    // covers most Gmail messages — fallback to raw body if the structure is odd.
    $rawBody = imap_fetchbody($conn, $uid, '1', FT_UID | FT_PEEK);
    if (!$rawBody) $rawBody = imap_body($conn, $uid, FT_UID | FT_PEEK);

    // Decode quoted-printable / base64 if applicable. We can't tell without
    // structure, so heuristics: try qp decode, then strip tags.
    $decoded = quoted_printable_decode($rawBody);
    $decoded = preg_replace('/\s+/', ' ', strip_tags($decoded));

    $messages[] = [
        'uid'     => (string) $uid,
        'from'    => $from,
        'subject' => $subject,
        'date'    => $dateStr,
        'body'    => $decoded,
    ];
}

imap_close($conn);

echo json_encode([
    'ok'           => true,
    'inboxCount'   => (int) $inboxCount,
    'matchedCount' => $matchedCount,
    'messages'     => $messages,
]);
