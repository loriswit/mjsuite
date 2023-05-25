# μJSuite

μJSuite is a tool that can run different workloads on different IoT-friendly JavaScript engines. Each engine is automatically built from source and gets executed inside a Docker container. This tool can be used to generate benchmarks and compare the performances of different engines.

## Usage

### Prerequisite

To run μJSuite, all you need is Docker to be installed on your machine.

The first time you run μJSuite, it will automatically download dependencies and build the source code.

### Command line

Clone or download this repository, then run `bin/mjsuite` (or `bin\mjsuite` on Windows) from the root of the project. The syntax is as follows:

```
bin/mjsuite <engine> <workload> [--debug] 
```

**Arguments**

- `engine`: one of the available JavaScript engines, which must match one of the folders in the `engines` directory.
- `workload`: the workload to run with this engine, which must match one of the scripts in the `workloads` directory (without the `.js` extension).

**Options**

- `--debug`: sets the log level to "debug", making the application more verbose.

**Example**

```
❯ bin/mjsuite jerryscript array-sort
Running workload 'array-sort' with engine JerryScript
Workload finished in 853 ms
```

**Note**: if you select a JavaScript engine for the first time, μJSuite will first download its source code and build a Docker image. This will take some time to complete, depending on the engine.

## Contributing

### Adding an engine

To add a new engine to the project, create a new folder in the `engines` directory. This folder must contain a manifest file, a Dockerfile and a workload template (optional).

#### Manifest

Create a `manifest.json` containing an object with the following fields:

- `name`: the name of the engine
- `repository`: the GitHub repository of the engine, in the form `user/repo`
- `version`: a git tag referencing the target version
- `clone` (optional): set to `true` to clone the repository instead of simply downloading it. This will take more time, but some engines require the source code to be in a git repository in order to be built.

**Note**: when running μJSuite, the `engine` must match the name of the **folder**, not the name specified in the manifest.

#### Dockerfile

The Dockerfile must describe how to build the source code of the engine. When executed, the Dockerfile receives `srcPath` as an argument, which contains the full path to the source code. This argument can be used to copy the source code into the image (e.g., `COPY $srcPath ./`)

Once the engine is compiled, we want the image to only contain the executable (and its dependencies, if any) **and** the [perf](https://perf.wiki.kernel.org/) tool, without all the build tools and cache. This can be achieved with [multi-stage builds](https://docs.docker.com/build/building/multi-stage/).

The entry point of the container must be set to the following:

```Dockerfile
ENTRYPOINT ["perf", "stat", "-e", "task-clock", "-x,", "{engine}"]
```

where `{engine}` is the engine executable file.

#### Workload template

Since different engines can have different specifications, some of them may need some adjustments before being able to run a workload (e.g., the `console.log` function could be named differently). If such adjustments are needed, we can create a `template.js` file with the following syntax:

```js
// code being executed before the workload
const console = { log: print }

// workload will be inserted here
${workload}

// code being executed after the workload
print(duration)
```

If no adjustments are needed, there's no need to create this file.

### Adding a workload

To add a new workload, create a JavaScript file in the `workloads` directory. The only requirement is that the workload must **print** the measured time (in milliseconds) to the standard output, which will be fetched by μJSuite.

Note that if a workload prints multiple lines to the standard output, then only the **last line** will be considered by μJSuite as the measured time.

## Troubleshooting

If μJSuite fails to work as expected, you can run it with the `--debug` option. This will increase the amount of information being printed to the console, which can be helpful to resolve problems.
