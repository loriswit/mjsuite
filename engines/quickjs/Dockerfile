FROM alpine:3.18 as build
ARG srcPath
WORKDIR /quickjs

RUN apk --no-cache add gcc musl-dev make

COPY $srcPath ./
RUN make


FROM alpine:3.18
WORKDIR /quickjs

RUN apk --no-cache add perf

COPY --from=build /quickjs/qjs /bin/

ENTRYPOINT ["qjs"]
