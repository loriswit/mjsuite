let data = []
for (let i = 0; i <= 10000; i++)
    data.push(i)

const res = []
const start = new Date().getTime()

for (let i = 0; i < 1000; ++i)
    res.push(data.find(x => x === 8000))

const time = new Date().getTime() - start

console.log(res.length === 1000)
console.log(time)
