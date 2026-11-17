import os
bind = '0.0.0.0:' + str(int(os.environ.get('PORT', '8080')))
workers = 1
threads = 4
worker_class = 'gthread'
timeout = 30
graceful_timeout = 20
keepalive = 5
limit_request_line = 4094
limit_request_fields = 50
limit_request_field_size = 8190
accesslog = None
errorlog = '-'
