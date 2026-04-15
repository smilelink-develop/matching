FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

ARG CACHEBUST=1
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["sh", "-c", "echo 'Running migrations...' && (npx prisma migrate deploy && echo 'Migrations done.') || echo 'Migration skipped or failed, continuing...' && echo 'Starting app...' && npm start"]
