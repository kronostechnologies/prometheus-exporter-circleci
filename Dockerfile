FROM node:11-alpine
WORKDIR /app

ENV LOG_LEVEL="info" \
    NODE_ENV="production" \
    HTTP_PORT=9600

COPY package.json .
COPY yarn.lock .

RUN yarn install

# Bundle app source
COPY ./dist .

EXPOSE 9600
ENTRYPOINT [ "node", "app.js" ]
