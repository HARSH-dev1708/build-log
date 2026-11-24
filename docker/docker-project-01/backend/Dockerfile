FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN useradd --system --no-create-home --uid 10001 appuser
COPY app.py .
USER appuser
CMD ["python", "app.py"]
