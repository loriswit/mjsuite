import {plot, Plot as PlotData} from "nodeplotlib"
import {Stats} from "./benchmark.js"

interface PlotEntry {
    title: string
    plot: PlotData[]
}

export class Plot {
    private readonly plots: PlotEntry[]

    public constructor(benchmark: Stats) {
        const stats = [
            {title: "Run time (ms)", id: "runTime", scale: 1 / 1000000},
            {title: "Memory usage (MB)", id: "maxMemory", scale: 1 / 1000000},
            {title: "Instructions count", id: "instructions", scale: 1},
            {title: "Branches", id: "branches", scale: 1},
            {title: "Branch misses", id: "branchMisses", scale: 1},
            {title: "Page faults", id: "pageFaults", scale: 1},
        ]

        this.plots = stats.map(({title, id: statId, scale}) => ({
            title,
            plot: Object.entries(benchmark).map(([workloadId, engineStats]) => {
                // hide engines that don't provide this stat
                const filtered = Object.fromEntries(Object.entries(engineStats)
                    .filter(([_, stat]) => !!stat[statId]))

                return {
                    name: workloadId,
                    x: Object.keys(filtered),
                    y: Object.values(filtered).map(stat => stat[statId] * scale),
                    type: "bar",
                }
            }),
        }))
    }

    public show() {
        if (IN_CONTAINER) {
            throw new Error(
                "Drawing plots inside a Docker container is not yet supported.\n" +
                "Please install Node.js and run `node build/main plot` instead.")
        }

        for (const entry of this.plots)
            plot(entry.plot, {title: {text: entry.title}})
    }
}
