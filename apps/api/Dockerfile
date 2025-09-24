FROM node:20-alpine

WORKDIR /app

COPY apps/api/package.json apps/api/package-lock.json* ./

RUN npm install --omit=dev

COPY . .
WORKDIR /app/apps/api

ENV NODE_ENV=production

EXPOSE 3000
CMD ["node", "index.js"]