FROM node:alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV MUSIC_DIR=/data/music

RUN apk add --no-cache ffmpeg yt-dlp

COPY dist ./dist
COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY app.js ./
EXPOSE 3000

CMD ["node", "app.js"]