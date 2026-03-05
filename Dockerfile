# ── Stage 1: Build the Next.js frontend ──────────────────────────────────
FROM node:22-alpine AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
ENV NEXT_PUBLIC_BACKEND_URL=""
RUN npm run build

# ── Stage 2: Runtime — Python + Node serving both services ───────────────
FROM python:3.12-slim

# Install Node.js (needed to serve the Next.js standalone build)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get purge -y curl && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# ── Backend ──────────────────────────────────────────────────────────────
WORKDIR /app/backend
COPY backend/ ./

RUN pip install --no-cache-dir \
    "fastapi==0.115.6" \
    "uvicorn[standard]==0.34.0" \
    "feedparser==6.0.11" \
    "newspaper4k==0.9.3.1" \
    "httpx==0.28.1" \
    "apscheduler==3.10.4" \
    "pydantic==2.10.6" \
    "python-dotenv==1.0.1" \
    "lxml==5.3.0" \
    "lxml-html-clean==0.4.1" \
    "pillow==11.1.0" \
    "aiofiles==24.1.0" \
    "nltk==3.9.1"

RUN python -c "import nltk; nltk.download('punkt_tab', quiet=True)"

# ── Frontend (standalone build) ──────────────────────────────────────────
WORKDIR /app/frontend

COPY --from=frontend-builder /build/frontend/.next/standalone ./
COPY --from=frontend-builder /build/frontend/.next/static ./.next/static
COPY --from=frontend-builder /build/frontend/public ./public

# ── Entrypoint ───────────────────────────────────────────────────────────
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 3000 8000

CMD ["/app/start.sh"]
