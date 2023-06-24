FROM node:20.3.0-alpine
ARG timeRepo=http://dl-cdn.alpinelinux.org/alpine/edge/testing
WORKDIR /v8

RUN apk --no-cache -X $timeRepo add perf time

ENTRYPOINT ["node"]
