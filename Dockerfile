FROM node:11-alpine as BASE
WORKDIR /app

COPY . .

RUN yarn --frozen-lockfile
RUN yarn build

FROM node:11-alpine
WORKDIR /app

ENV LOG_LEVEL="info" \
    NODE_ENV="production" \
    HTTP_PORT=9600

COPY package.json .
COPY yarn.lock .

RUN yarn --frozen-lockfile

# Bundle app source
COPY --from=BASE /app/dist .

EXPOSE 9600
ENTRYPOINT [ "node", "app.js" ]
