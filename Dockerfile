# Author: Alex Picon <alexnpc@me.com>
FROM python:3.12-slim
RUN pip install --no-cache-dir uv==0.11.30
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY server ./server
COPY apps ./apps
COPY slides ./slides
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1
EXPOSE 8888
CMD ["uvicorn", "server.main:apps_server", "--host", "0.0.0.0", "--port", "8888", "--proxy-headers"]
