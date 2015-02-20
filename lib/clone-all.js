var recursive = require('./recursive-transform.js')

module.exports = cloneAll

function cloneAll(clone, internalize, pkg, src, dst, credentials, ready) {
  return clone(
      pkg
    , src
    , dst
    , credentials
    , recursive(clone, src, dst, credentials, internalize)
    , ready
  )
}
