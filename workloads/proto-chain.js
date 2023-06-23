var N = 20; // iterations
var D = 1e4; // chain depth

var res
var startTime = Date.now()

for (var i = 0; i < N; ++i) {
    var obj = {prop: 12345}
    for (var j = 0; j < D; ++j) {
        obj = Object.create(obj)
        res = obj.prop
    }
}

console.log(res)
console.log(Date.now() - startTime)
