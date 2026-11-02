FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

RUN npm install -g pnpm tsx

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps

RUN pnpm install

WORKDIR /app/apps/academic-catalog-service

EXPOSE 3006

CMD ["npx", "tsx", "src/main.ts"]

