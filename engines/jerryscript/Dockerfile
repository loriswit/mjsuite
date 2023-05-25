FROM python:3.11-alpine3.18 as build
ARG srcPath
WORKDIR /jerry

RUN apk --no-cache add gcc musl-dev make cmake

COPY $srcPath ./
RUN python tools/build.py


FROM alpine:3.18
WORKDIR /jerry

RUN apk --no-cache add perf

COPY --from=build /jerry/build/bin/jerry /bin/
COPY --from=build /jerry/tests/hello.js ./

ENTRYPOINT ["perf", "stat", "-e", "task-clock", "-x,", "jerry"]
CMD ["hello.js"]
