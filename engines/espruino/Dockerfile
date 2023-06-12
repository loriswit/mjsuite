FROM python:3.11-alpine3.18 as build
ARG srcPath
WORKDIR /espruino

RUN apk --no-cache add py3-pip patch curl make git g++ musl-dev
RUN pip install pyserial
RUN pip install nrfutil

COPY $srcPath/scripts /espruino/scripts
COPY $srcPath/targetlibs /espruino/targetlibs
COPY $srcPath/boards /espruino/boards
RUN source scripts/provision.sh ALL

COPY $srcPath .
ENV RELEASE 1
RUN make


FROM alpine:3.18
WORKDIR /espruino

RUN apk --no-cache add libstdc++ perf
COPY --from=build /espruino/bin/espruino /bin/

ENTRYPOINT ["perf", "stat", "-x,", "espruino"]
CMD ["-e", "print('Hello Espruino!')"]
