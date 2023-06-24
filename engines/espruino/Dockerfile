FROM python:3.11-slim-bullseye as build
ARG srcPath
WORKDIR /espruino

RUN apt-get update
RUN apt-get install -qq -y python3-pip git
RUN pip install pyserial
RUN pip install nrfutil

COPY $srcPath/scripts /espruino/scripts
COPY $srcPath/targetlibs /espruino/targetlibs
COPY $srcPath/boards /espruino/boards
RUN bash -c "source scripts/provision.sh ALL"

COPY $srcPath .
RUN RELEASE=1 make

FROM ubuntu:22.10
WORKDIR /espruino

RUN apt-get update && apt-get install -qq -y linux-tools-generic time
RUN ln -sf /usr/lib/linux-tools/*-generic/perf /usr/bin/perf
COPY --from=build /espruino/bin/espruino /bin/

ENTRYPOINT ["espruino"]
