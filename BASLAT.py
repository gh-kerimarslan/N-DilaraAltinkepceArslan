#!/usr/bin/env python3
"""Serve this folder locally; Python 3, no extra dependencies."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
import webbrowser
root = Path(__file__).resolve().parent
server = None
for port in range(8765, 8785):
    try:
        server = ThreadingHTTPServer(('127.0.0.1', port), partial(SimpleHTTPRequestHandler, directory=str(root)))
        break
    except OSError:
        continue
if server is None:
    raise SystemExit('8765–8784 portları dolu. Açık önizlemeleri kapatıp yeniden deneyin.')
url = 'http://127.0.0.1:' + str(server.server_address[1]) + '/'
print('ALARM / Dilara Altınkepçe Arslan: ' + url, flush=True)
print('Kapatmak için Control+C. Bu pencere açık kalmalıdır.', flush=True)
webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
