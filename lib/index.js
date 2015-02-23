var recursive = require('./recursive-transform.js')
  , clone = require('./clone')

module.exports = cloneAll

function cloneAll(pkg, src, dst, options, ready) {
  if(!ready && typeof options === 'function') {
    ready = options
    options = {}
  }

  if(options.recursive) {
    options = recursive(src, dst, options)
  }

  return clone(pkg, src, dst, options, ready)
}
