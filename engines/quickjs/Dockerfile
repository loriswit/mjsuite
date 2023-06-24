FROM alpine:3.18 as build
ARG srcPath
WORKDIR /quickjs

RUN apk --no-cache add gcc musl-dev make

COPY $srcPath ./
RUN make


FROM alpine:3.18
ARG timeRepo=http://dl-cdn.alpinelinux.org/alpine/edge/testing
WORKDIR /quickjs

RUN apk --no-cache -X $timeRepo add perf time

COPY --from=build /quickjs/qjs /bin/

ENTRYPOINT ["qjs"]
