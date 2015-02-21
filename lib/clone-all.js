var recursive = require('./recursive-transform.js')
var clone = require('./clone')

module.exports = cloneAll

function cloneAll(pkg, src, dst, options, ready) {
  return clone(
      pkg
    , src
    , dst
    , options.recursive ? recursive(clone, src, dst, options) : options
    , ready
  )
}
