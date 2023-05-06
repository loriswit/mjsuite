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
ENV RELEASE 1
RUN make

FROM debian:bullseye-slim
WORKDIR /espruino

COPY --from=build /espruino/bin/espruino /bin/

ENTRYPOINT ["espruino"]
CMD ["-e", "print('Hello Espruino!')"]
