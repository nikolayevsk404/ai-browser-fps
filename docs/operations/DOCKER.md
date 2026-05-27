# Docker

## Dockerfile final

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
RUN npm ci
COPY . .
RUN npm run build
```

## docker-compose.yml

```yaml
version: "3.8"

services:
  game:
    build: .
    container_name: ai-browser-fps
    ports:
      - "9000:9000"
    environment:
      - NODE_ENV=production
      - PORT=9000
```

## Rodar

```bash
docker compose up --build
```

Jogo (client + API + WebSocket):

```txt
http://localhost:9000
```

Health check:

```txt
http://localhost:9000/health
```

## Problemas comuns

### `ERR_MODULE_NOT_FOUND` em `shared/src/index.ts`

A imagem pode estar usando cache de um build antigo. Rebuild sem cache:

```bash
docker compose build --no-cache
docker compose up
```

O runtime precisa do pacote `@ai-browser-fps/shared` apontando para `shared/dist` (não para `shared/src`).
