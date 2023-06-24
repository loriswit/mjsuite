FROM alpine:3.18 as build
ARG srcPath
WORKDIR /duktape

RUN apk --no-cache add gcc musl-dev make

COPY $srcPath ./
RUN make -f Makefile.cmdline


FROM alpine:3.18
ARG timeRepo=http://dl-cdn.alpinelinux.org/alpine/edge/testing
WORKDIR /duktape

RUN apk --no-cache -X $timeRepo add perf time

COPY --from=build /duktape/duk /bin/

ENTRYPOINT ["duk"]
