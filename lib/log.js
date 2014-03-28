var duplexer = require('duplexer')
  , json = require('JSONStream')
  , through = require('through')

module.exports = function() {
  var ingress = through()
    , egress = through()

  console.log('init')

  ingress.pipe(json.parse(['name'])).on('data', function(xs) {
    console.log('cloning %s...', xs)
  })

  ingress.pipe(egress)

  return duplexer(ingress, egress)
}
