var N = 2e4; // iterations
var S = 1e3; // array size

var res
var startTime = Date.now()

for (var i = 0; i < N; ++i) {
    var array = []
    for (var j = 0; j < S; j++)
        array.push(i + j)
    res = array[0]
}

console.log(Date.now() - startTime)
