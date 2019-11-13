FROM node:11-alpine as BASE
WORKDIR /app

COPY . .

RUN apk --no-cache add --virtual native-deps \
  g++ gcc libgcc libstdc++ linux-headers make python && \
  yarn --frozen-lockfile && \
  apk del native-deps
RUN yarn build

FROM node:11-alpine
WORKDIR /app

ENV LOG_LEVEL="info" \
    NODE_ENV="production" \
    HTTP_PORT=9600

COPY package.json .
COPY yarn.lock .

RUN apk --no-cache add --virtual native-deps \
  g++ gcc libgcc libstdc++ linux-headers make python && \
  yarn --frozen-lockfile && \
  apk del native-deps

# Bundle app source
COPY --from=BASE /app/dist .

EXPOSE 9600
ENTRYPOINT [ "node", "app.js" ]
