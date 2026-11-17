"""ALARM read-only signal service. Python 3.12+ WSGI application. Feed evaluation uses the standard library.

Feeds are configured by the owner in a local JSON file, never by HTTP callers.
No feed is enabled by default. A missing, stale or invalid input is not NORMAL.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
import ipaddress, json, math, os, socket, threading, time, urllib.request

CHANNELS = ('moloch', 'cheetah', 'cockroach', 'raven', 'gorilla')
ALLOWED_HOSTS = frozenset(h.strip().lower() for h in os.getenv('ALARM_FEED_HOSTS', '').split(',') if h.strip())
ORIGINS = frozenset(h.strip().rstrip('/') for h in os.getenv('ALARM_ALLOWED_ORIGINS', 'https://dilaraaltinkepcearslan.com,https://www.dilaraaltinkepcearslan.com').split(',') if h.strip())
CONFIG_PATH = Path(os.getenv('ALARM_CONFIG_PATH', str(Path(__file__).with_name('channels.example.json'))))
MAX_BYTES = 1_000_000
CACHE_SECONDS = max(60, min(int(os.getenv('ALARM_CACHE_SECONDS', '300')), 3600))
LOCK = threading.Lock()
cached = None
expires = 0.0

def now():
    return datetime.now(timezone.utc)

def iso(value):
    return value.isoformat().replace('+00:00', 'Z')

def unknown(reason='not_configured', config=None):
    config = config or {}
    return {'state': 'unknown', 'value': None, 'observedAt': None,
            'sourceLabel': str(config.get('source_label', ''))[:160],
            'metricLabel': str(config.get('metric_label', ''))[:160],
            'maxAgeSeconds': config.get('max_age_seconds', 3600), 'reason': reason}

def get_path(data, path):
    if not isinstance(path, list) or not path or len(path) > 12:
        raise ValueError('Invalid JSON path')
    for key in path:
        if not isinstance(key, (int, str)) or isinstance(key, bool):
            raise ValueError('Invalid path segment')
        data = data[key]
    return data

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Feed redirects are disabled')

def fetch_feed(url):
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or parsed.hostname not in ALLOWED_HOSTS or parsed.username or parsed.password or parsed.port not in (None, 443) or parsed.fragment:
        raise ValueError('Feed URL is not allowlisted')
    # Only configured public provider hosts are permitted; reject private/metadata DNS.
    addresses = socket.getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
        raise ValueError('Nonpublic feed address')
    request = urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': 'ALARM-Artwork/1.0'})
    # Disable environment proxies and redirects. All configuration is owner-controlled.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    with opener.open(request, timeout=8) as response:
        mime = response.headers.get_content_type()
        if mime != 'application/json' and not mime.endswith('+json'):
            raise ValueError('Expected JSON feed')
        data = response.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValueError('Oversized feed')
    return json.loads(data)

def evaluate(data, config, at=None):
    at = at or now()
    value = get_path(data, config['value_path'])
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError('Non-finite measurement')
    stamp = get_path(data, config['time_path'])
    if not isinstance(stamp, str):
        raise ValueError('Observation timestamp required')
    observed = datetime.fromisoformat(stamp.replace('Z', '+00:00'))
    if observed.tzinfo is None:
        raise ValueError('Timestamp must include timezone')
    max_age = config['max_age_seconds']
    if isinstance(max_age, bool) or not isinstance(max_age, int) or not 1 <= max_age <= 31536000:
        raise ValueError('Invalid maximum age')
    age = (at - observed).total_seconds()
    if age < -300:
        raise ValueError('Timestamp is in the future')
    watch, alarm = config['watch_threshold'], config['alarm_threshold']
    if any(isinstance(x, bool) or not isinstance(x, (int,float)) or not math.isfinite(x) for x in (watch, alarm)):
        raise ValueError('Explicit finite thresholds required')
    direction = config['direction']
    if direction == 'above' and watch < alarm:
        state = 'alarm' if value >= alarm else 'watch' if value >= watch else 'normal'
    elif direction == 'below' and watch > alarm:
        state = 'alarm' if value <= alarm else 'watch' if value <= watch else 'normal'
    else:
        raise ValueError('Invalid direction or threshold ordering')
    if age > max_age:
        state = 'stale'
    return {'state': state, 'value': value, 'observedAt': iso(observed),
            'sourceLabel': str(config['source_label'])[:160],
            'metricLabel': str(config['metric_label'])[:160], 'maxAgeSeconds': max_age,
            'reason': ''}

def collect(config):
    if not isinstance(config, dict):
        return unknown('Invalid source configuration')
    if config.get('enabled') is not True:
        return unknown()
    try:
        return evaluate(fetch_feed(config['url']), config)
    except Exception:
        # Do not expose URLs, credential-bearing query strings or provider errors.
        return unknown('Source unavailable or measurement invalid', config)

def status():
    global cached, expires
    with LOCK:
        if cached is not None and time.monotonic() < expires:
            return cached
        try:
            config = json.loads(CONFIG_PATH.read_text())
            feeds = config['channels']
            if not isinstance(feeds, dict):
                raise ValueError('Invalid configuration')
        except (OSError, ValueError, KeyError):
            feeds = {}
        with ThreadPoolExecutor(max_workers=5) as pool:
            values = list(pool.map(lambda c: collect(feeds.get(c, {})), CHANNELS))
        cached = {'schemaVersion': 1, 'generatedAt': iso(now()), 'channels': dict(zip(CHANNELS, values))}
        expires = time.monotonic() + CACHE_SECONDS
        return cached

def app(environ, start_response):
    method = environ.get('REQUEST_METHOD', 'GET')
    path = environ.get('PATH_INFO', '/')
    if method not in ('GET', 'HEAD'):
        code, payload = '405 Method Not Allowed', {'error': 'read_only'}
    elif path == '/health':
        code, payload = '200 OK', {'ok': True}
    elif path == '/v1/status':
        code, payload = '200 OK', status()
    else:
        code, payload = '404 Not Found', {'error': 'not_found'}
    raw = json.dumps(payload, allow_nan=False, separators=(',', ':')).encode()
    headers = [('Content-Type', 'application/json; charset=utf-8'), ('Content-Length', str(len(raw))),
               ('Cache-Control', 'no-store'), ('X-Content-Type-Options', 'nosniff'),
               ('Referrer-Policy', 'no-referrer'), ('Vary', 'Origin'),
               ('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")]
    origin = environ.get('HTTP_ORIGIN')
    if origin in ORIGINS:
        headers.append(('Access-Control-Allow-Origin', origin))
    if code.startswith('405'):
        headers.append(('Allow', 'GET, HEAD'))
    start_response(code, headers)
    return [] if method == 'HEAD' else [raw]

if __name__ == '__main__':
    # Local inspection only. Production uses the pinned Gunicorn server.
    from wsgiref.simple_server import make_server
    with make_server('127.0.0.1', int(os.getenv('PORT', '8080')), app) as httpd:
        httpd.serve_forever()
