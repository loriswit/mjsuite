FROM alpine:3.18 as build
ARG srcPath
WORKDIR /mujs

RUN apk --no-cache add gcc musl-dev readline-dev make

COPY $srcPath ./
RUN make prefix=/usr/local install


FROM alpine:3.18
WORKDIR /mujs

RUN apk --no-cache add perf

COPY --from=build /usr/local/bin/mujs /bin/

ENTRYPOINT ["mujs"]
