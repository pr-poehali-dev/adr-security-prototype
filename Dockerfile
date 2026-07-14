# ── Stage 1: сборка фронтенда ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_API_URL / VITE_TEMPLATES_API_URL подставляются во время сборки через build args
ARG VITE_API_URL=http://localhost:8000
ARG VITE_TEMPLATES_API_URL=http://localhost:8001
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_TEMPLATES_API_URL=${VITE_TEMPLATES_API_URL}

RUN npm run build

# ── Stage 2: раздача статики через nginx ───────────────────────────────────
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]