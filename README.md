# Getting started
In order to run this project you need to install [Ollama](https://ollama.com/) and download the model named `llama3.2:latest` using a `pull` command from the llama cli.

You will also need [Docker Desktop](https://www.docker.com/products/docker-desktop/) since the project is packaged as a docker compose file.

## Running locally
Copy the `.env.example` file to `.env` and fill in the blacks. It comes with defaults it can.

Run `docker compose up -d` to start the app and it's dependencies in docker containers.

Please note that every time you update the env file you need to run the `docker-compose` command again for the changes to be reflected.

## Watching the results
The docker will also spin up a MySQL DB where the app keeps track of the posts it processed.
You can access it with the credentials from the `.env.example` file with your favourite MYSQL GUI tool.
Just make sure to point it to localhost and port `3308` (configurable in the docker compose file).

# Run open web UI
```
docker run -d -p 5005:8080 -e WEBUI_AUTH=False -e OLLAMA_BASE_URL=http://host.docker.internal -v open-webui:/app/backend/data --name open-webui --restart always ghcr.io/open-webui/open-webui:main
```