FROM node:14-alpine

ENV TZ 'Europe/Kiev'

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

CMD ["node", "./dist/main.js"]
