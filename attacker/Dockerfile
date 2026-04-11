FROM node:18

WORKDIR /app

COPY server.js .

RUN npm init -y && npm install express

EXPOSE 3000

CMD ["node", "server.js"]
