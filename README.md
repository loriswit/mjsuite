# μJSuite

μJSuite is a tool that can run different workloads on different IoT-friendly JavaScript engines. Each engine is automatically built from source and gets executed inside a Docker container. This tool can be used to generate benchmarks and compare the performances of different engines.

## Usage

### Prerequisite

To run μJSuite, all you need is Docker to be installed on your machine.

The first time you run μJSuite, it will automatically download dependencies and build the source code.

### Command line

Clone or download this repository, then run `bin/mjsuite` (or `bin\mjsuite` on Windows) from the root of the project. To get a list of available commands and options, run `bin/mjsuite help`.

When requested as an argument or option, a **workload** must match a script in the `workloads` directory (without the `.js` extension), and an **engine** must match one of the folders in the `engines` directory.

All available commands are described below. Each of them provides a `--help` option that displays additional information about their usage.

#### Benchmark

```
bin/mjsuite benchmark [options]
```

This command runs all workloads with all engines and generates a benchmark. The results are then written into a JSON file. You can also specify which workloads and engines to run using the options below.

When encountering a new engine, μJSuite will automatically download its source code and build a Docker image. This will take some time to complete, depending on the engine.

The following options are available:

- `-w`, `--workload <workloads...>`: the workload(s) to run (default: all). 
- `-e`, `--engine <engines...>`: the engine(s) to use (default: all).
- `-o`, `--output <filename>`: the output file that will store the results.

#### Engine

To list all available engines, run:

```
bin/mjsuite engine list
```

To download and build a specific engine, run:

```
bin/mjsuite engine setup <engine>
```

Note that this is done automatically when the `benchmark` command encounters a new engine. Running this command again will **rebuild** the engine and overwrite the existing image.

#### Workload

To list all available workloads, run:

```
bin/mjsuite workload list
```

#### Example

```
❯ bin/mjsuite benchmark --workload array-sort --engine jerryscript
Running workload 'array-sort' with engine JerryScript
Workload finished in 853 ms
Saved results to benchmark_2023-06-12_19-29-22.json
```

## Contributing

### Adding an engine

To add a new engine to the project, create a new folder in the `engines` directory. This folder must contain a manifest file, a Dockerfile and a workload template (optional).

#### Manifest

Create a `manifest.json` containing an object with the following fields:

- `name`: the name of the engine
- `repository`: the GitHub repository of the engine, in the form `user/repo`
- `version`: a git tag referencing the target version
- `source` (optional): a URL to the source code. If set, μJSuite will download from this URL instead of GitHub. This can be helpful with embeddable engines that provide pre-processed packaged source code.
- `clone` (optional): set to `true` to clone the repository instead of simply downloading it. This will take more time, but some engines require the source code to be in a git repository in order to be built.

**Note**: when running μJSuite, the `engine` must match the name of the **folder**, not the name specified in the manifest.

#### Dockerfile

The Dockerfile must describe how to build the source code of the engine. When executed, the Dockerfile receives `srcPath` as an argument, which contains the full path to the source code. This argument can be used to copy the source code into the image (e.g., `COPY $srcPath ./`)

Once the engine is compiled, we want the image to only contain the executable (and its dependencies, if any) without all the build tools and cache. This can be achieved with [multi-stage builds](https://docs.docker.com/build/building/multi-stage/). We also need the final image to include **both** the [perf](https://perf.wiki.kernel.org/) and [time](https://en.wikipedia.org/wiki/Time_(Unix)) tools

The entry point of the container must be set to the engine executable file.

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

If μJSuite fails to work as expected, you can run it with the `--verbose` option. This will increase the amount of information being printed to the console, which can be helpful to resolve problems.
