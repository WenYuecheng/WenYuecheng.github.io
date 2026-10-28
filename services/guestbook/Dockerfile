FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORTAL_DB_PATH=/data/guestbook.sqlite3

RUN groupadd --gid 10001 portal \
    && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin portal \
    && install -d -o portal -g portal -m 0700 /data
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py mail_template.py private_content.py ./
USER 10001:10001
VOLUME ["/data"]
EXPOSE 8093
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8093/health', timeout=2).close()"
CMD ["uvicorn", "app:app", "--host", "127.0.0.1", "--port", "8093", "--workers", "1", "--no-proxy-headers", "--no-access-log", "--limit-concurrency", "32"]
