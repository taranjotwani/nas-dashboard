FROM node:alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV MUSIC_DIR=/data/music

# Add YT-DLP and FFMPEG for audio processing and downloading
# RUN apk add --no-cache ffmpeg yt-dlp

# WORKDIR /app/frontend
# RUN npm install
# RUN npm run build

WORKDIR  /app
COPY frontend/dist ./dist
COPY dist/. /app/dist/
COPY index.html ./dist/
COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY app.js ./
EXPOSE 3000

CMD ["node", "app.js"]