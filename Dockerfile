FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build


FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Next.js standalone 서버
COPY --from=builder /app/.next/standalone ./

# 정적 파일
COPY --from=builder /app/.next/static ./.next/static

# public 파일
COPY --from=builder /app/public ./public

# config 파일
COPY --from=builder /app/config ./config

# 저장소 디렉터리
RUN mkdir -p /app/public/storage

EXPOSE 3000

CMD ["node", "server.js"]