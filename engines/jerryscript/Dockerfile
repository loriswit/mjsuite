FROM python:3.11-alpine3.18 as build
ARG srcPath
WORKDIR /jerry

RUN apk --no-cache add gcc musl-dev make cmake

COPY $srcPath ./
RUN python tools/build.py


FROM alpine:3.18
ARG timeRepo=http://dl-cdn.alpinelinux.org/alpine/edge/testing
WORKDIR /jerry

RUN apk --no-cache -X $timeRepo add perf time

COPY --from=build /jerry/build/bin/jerry /bin/

ENTRYPOINT ["jerry"]
