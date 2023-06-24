FROM ubuntu:22.10 as build
ARG srcPath
WORKDIR /moddable

RUN apt-get update
RUN apt-get install -qq -y gcc make

COPY $srcPath ./
WORKDIR /moddable/xs/makefiles/lin
RUN MODDABLE=/moddable/ make release


FROM ubuntu:22.10
WORKDIR /xs

RUN apt-get update && apt-get install -qq -y linux-tools-generic time
RUN ln -sf /usr/lib/linux-tools/*-generic/perf /usr/bin/perf

COPY --from=build /moddable/build/bin/lin/release/xst /bin/

ENTRYPOINT ["xst"]
