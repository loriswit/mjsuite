var data = []
for (var i = 0; i <= 10000; i++)
    data.push(i)

var res = []

for (var i = 0; i < 1000; ++i)
    res.push(data[data.indexOf(8000)])

console.log(res.length === 1000)
