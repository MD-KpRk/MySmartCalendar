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
# Копируем схему Prisma и генерируем клиент
RUN npx prisma generate

# Компилируем TypeScript
RUN npm run build

# --- STAGE 3: Final Production Image ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Устанавливаем только prod зависимости для бэкенда
COPY backend/package*.json ./
RUN npm install --only=production

# Копируем скомпилированный бэкенд
COPY --from=backend-builder /app/backend/dist ./dist
# Копируем Prisma Client (он находится внутри node_modules)
COPY --from=backend-builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /app/backend/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=backend-builder /app/backend/prisma ./prisma

# Копируем собранный статический фронтенд в папку public бэкенда
COPY --from=frontend-builder /app/backend/public ./public

EXPOSE 3000

CMD ["node", "dist/index.js"]
