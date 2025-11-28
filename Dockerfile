FROM node:24-alpine

WORKDIR /app

RUN corepack enable

VOLUME [ "/app/.pnpm-store", "/app/node_modules" ]

# Set pnpm store location
RUN pnpm config --global set store-dir /app/.pnpm-store

COPY package.json pnpm-lock.yaml* ./

EXPOSE 5173 3001

CMD ["sh", "-c", "pnpm run dev & pnpm run server & wait"]
