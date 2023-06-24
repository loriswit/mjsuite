FROM alpine:3.18 as build
ARG srcPath
WORKDIR /mujs

RUN apk --no-cache add gcc musl-dev readline-dev make

COPY $srcPath ./
RUN make prefix=/usr/local install


FROM alpine:3.18
ARG timeRepo=http://dl-cdn.alpinelinux.org/alpine/edge/testing
WORKDIR /mujs

RUN apk --no-cache -X $timeRepo add perf time

COPY --from=build /usr/local/bin/mujs /bin/

ENTRYPOINT ["mujs"]
