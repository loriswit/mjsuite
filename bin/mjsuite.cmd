@echo off

set NODE_IMAGE=node:20.3.0-alpine
set ROOT_DIR=%~dp0..

if not exist %ROOT_DIR%\build\ (
    echo [94mWelcome to �JSuite!
    echo Performing first-time setup[0m
    docker run --rm -q --name mjsuite ^
        -v %ROOT_DIR%:/mjsuite ^
        %NODE_IMAGE% /mjsuite/bin/setup %* || exit /b 1
)

docker run --rm -itq --name mjsuite ^
    -w /mjsuite ^
    -v %ROOT_DIR%:/mjsuite ^
    -v /var/run/docker.sock:/var/run/docker.sock ^
    -e MOUNT_SRC=%ROOT_DIR% ^
    %NODE_IMAGE% /mjsuite/build/main %*
