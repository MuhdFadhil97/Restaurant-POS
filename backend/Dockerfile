FROM node:20-slim

# chromium: puppeteer-core ships no browser; e-invoice receipt PDFs and report
# PDF exports render through it (see reports/export/browserPool.ts).
RUN apt-get update -y && apt-get install -y openssl chromium fonts-liberation && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm install

COPY . .
RUN npm run build

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
