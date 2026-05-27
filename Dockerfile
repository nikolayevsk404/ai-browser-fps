FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json

RUN npm ci

COPY . .

RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

COPY package*.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
COPY --from=deps /app/shared/dist shared/dist
RUN npm ci --omit=dev

COPY --from=deps /app/server/dist server/dist
COPY --from=deps /app/client/dist client/dist

ENV NODE_ENV=production
EXPOSE 9000

CMD ["npm", "run", "start", "-w", "server"]
