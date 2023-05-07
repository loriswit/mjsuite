let data = [
    "warning", "understanding", "height", "consequence", "chocolate", "Arrival",
    "security", "Transportation", "Affair", "disease", "cheek", "thanks",
    "confusion", "poem", "1234", "assignment", "girlfriend", "Breath", "grocery",
    "editor", "science", "County", "Winner", "republic", "truth", "advice",
    "depression", "feedback", "candidate", "Volume", "competition", "potato",
    "Establishment", "office", "member", "classroom", "Tongue", "idea", "decision",
    "medicine", "Series", "insect", "supermarket", "loss", "poet", "region",
    "departure", "sister", "introduction", "entry", "sample",
]

const start = new Date().getTime()

for (let i = 0; i < 100000; ++i)
    data.sort()

const time = new Date().getTime() - start

console.log(data[0] === "1234")
console.log(data[1] === "Affair")
console.log(data[data.length - 1] === "warning")

console.log(time)
