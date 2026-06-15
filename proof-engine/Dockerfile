FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8000
EXPOSE 8000

# Use the shell form so $PORT is expanded at runtime (e.g. on Railway).
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}
