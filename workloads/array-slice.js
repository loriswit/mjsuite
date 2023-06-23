var N = 1e4; // iterations
var S = 1e4; // array size

var array = []
for (var i = 0; i < S; i++)
    array.push(i)

var res
var startTime = Date.now()

for (var i = 0; i < N; ++i)
    res = array.slice()

console.log(Date.now() - startTime)
