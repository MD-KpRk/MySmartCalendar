# --- STAGE 1: Build Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

COPY frontend/ ./
RUN npm run build

# --- STAGE 2: Build Backend ---
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# --- STAGE 3: Final Production Image ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Копируем package.json и устанавливаем prod зависимости
COPY backend/package*.json ./
RUN npm install --only=production

# Копируем схему Prisma и генерируем клиент прямо в финальном образе
COPY backend/prisma ./prisma
RUN npx prisma generate

# Копируем скомпилированный бэкенд
COPY --from=backend-builder /app/backend/dist ./dist

# Копируем собранный статический фронтенд в папку public бэкенда
COPY --from=frontend-builder /app/backend/public ./public

EXPOSE 3000

CMD ["node", "dist/index.js"]
