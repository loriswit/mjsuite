FROM alpine:3.18 as build
ARG srcPath
WORKDIR /duktape

RUN apk --no-cache add gcc musl-dev make

COPY $srcPath ./
RUN make -f Makefile.cmdline


FROM alpine:3.18
WORKDIR /duktape

RUN apk --no-cache add perf

COPY --from=build /duktape/duk /bin/

ENTRYPOINT ["duk"]
