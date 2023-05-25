let data = []
for (let i = 0; i <= 10000; i++)
    data.push(i)

const res = []

for (let i = 0; i < 1000; ++i)
    res.push(data.find(x => x === 8000))

console.log(res.length === 1000)
