FROM node:alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package-lock.json ./frontend/

RUN npm install

WORKDIR /app/frontend
RUN npm install
RUN npm run build

WORKDIR /app
COPY . .
RUN npm run frontend

FROM node:alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV MUSIC_DIR=/data/music

RUN apk add --no-cache ffmpeg yt-dlp

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY app.js ./
COPY dist ./dist

EXPOSE 3000

CMD ["node", "app.js"]