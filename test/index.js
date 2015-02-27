module.exports = testAll

var tape = require('tape')

var all = [
    require('./lint.js')
  , require('./clone.js')
  , require('./clone-recursive.js')
]

if(require.main === module) {
  module.exports()
}

function testAll() {
  all.forEach(function(xs) {
    xs(tape)
  })
}
