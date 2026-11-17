FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8080
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py channels.example.json gunicorn.conf.py ./
USER 65532:65532
EXPOSE 8080
CMD ["gunicorn", "--config", "gunicorn.conf.py", "server:app"]
