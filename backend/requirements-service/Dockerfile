FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

RUN npm install -g pnpm tsx

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps

RUN pnpm install

WORKDIR /app/apps/requirements-service

EXPOSE 3002

CMD ["npx", "tsx", "src/main.ts"]

