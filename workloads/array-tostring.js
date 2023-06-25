var N = 1e6; // iterations

var res = {}
var array = []
var startTime = Date.now()

for (var i = 0; i < N; ++i) {
    if(i % 100 === 0) {
        res = {}
        array = []
    }
    array.push(i)
    res[array] = -i
}

console.log(Date.now() - startTime)
