FROM node:24-alpine

WORKDIR /app

RUN corepack enable

VOLUME [ "/app/.pnpm-store", "/app/node_modules" ]

RUN pnpm config --global set store-dir /app/.pnpm-store

COPY package.json pnpm-lock.yaml* ./

EXPOSE 5173 3001

CMD ["sh", "-c", "pnpm install && pnpm run build:server && pnpm run dev & node dist/server/index.js & wait"]
