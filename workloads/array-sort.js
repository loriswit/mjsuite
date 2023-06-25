var N = 4e5; // iterations

var array = [
    "warning", "understanding", "height", "consequence", "chocolate", "Arrival",
    "security", "Transportation", "Affair", "disease", "cheek", "thanks",
    "confusion", "poem", "1234", "assignment", "girlfriend", "Breath", "grocery",
    "editor", "science", "County", "Winner", "republic", "truth", "advice",
    "depression", "feedback", "candidate", "Volume", "competition", "potato",
    "Establishment", "office", "member", "classroom", "Tongue", "idea", "decision",
    "medicine", "Series", "insect", "supermarket", "loss", "poet", "region",
    "departure", "sister", "introduction", "entry", "sample",
]

var res
var startTime = Date.now()

for (var i = 0; i < N; ++i)
    res = array.slice().sort()[0]

console.log(Date.now() - startTime)
