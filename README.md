# Getting started
Run `docker compose up -d` to start the app and it's dependencies in docker containers.

# Run open web UI
```
docker run -d -p 5005:8080 -e WEBUI_AUTH=False -e OLLAMA_BASE_URL=http://host.docker.internal -v open-webui:/app/backend/data --name open-webui --restart always ghcr.io/open-webui/open-webui:main
```