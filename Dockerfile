# Backend API สำหรับ Cloud Run / บริการ container อื่น
# build: docker build -t yrc-api .
# run:  docker run -p 8080:8080 --env-file backend/.env -e PORT=8080 yrc-api

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY backend/tsconfig.json backend/
COPY backend/src backend/src
RUN npm run build -w backend

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev
COPY --from=build /app/backend/dist ./backend/dist
EXPOSE 8080
CMD ["node", "backend/dist/index.js"]
