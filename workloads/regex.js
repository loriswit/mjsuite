var N = 4e5; // iterations

var str = "  for (var i = 0; i < 100; i++) { console.log(i) } // comment"
var startTime = Date.now()

var match
for (var i = 0; i < N; ++i) {
    var regex = /for\s*\(\s*(.+)\s*;\s*(.+)\s*;\s*(.+)\s*\)\s*\{\s*(\S+)\s*}/
    match = str.match(regex)
}

console.log(match[4] === "console.log(i)")
console.log(Date.now() - startTime)
