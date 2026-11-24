FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN useradd --system --no-create-home --uid 10001 appuser
COPY app.py .
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
USER appuser
CMD ["python", "app.py"]
