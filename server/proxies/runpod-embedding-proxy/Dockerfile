FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
ENV LISTEN_HOST=172.17.0.1 LISTEN_PORT=8001
CMD ["sh", "-c", "uvicorn app:app --host $LISTEN_HOST --port $LISTEN_PORT"]
