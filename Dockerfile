FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache make

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install

COPY . .

EXPOSE 3000 3001

CMD ["make", "dev"]
