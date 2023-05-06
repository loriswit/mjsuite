FROM python:3.11-slim-bullseye as build
ARG srcPath
WORKDIR /jerry

RUN apt-get update
RUN apt-get -qq -y install gcc gcc-arm-none-eabi cmake

COPY $srcPath ./
RUN python tools/build.py


FROM debian:bullseye-slim
WORKDIR /jerry

COPY --from=build /jerry/build/bin/jerry /bin/
COPY --from=build /jerry/tests/hello.js ./

ENTRYPOINT ["jerry"]
CMD ["hello.js"]
