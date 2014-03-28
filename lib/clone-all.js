var recursive = require('./recursive-transform.js')
  , duplexer = require('duplexer')

module.exports = cloneAll

function cloneAll(clone, pkg, src, dst, credentials, xform, ready) {
  return clone(
      pkg
    , src
    , dst
    , credentials
    , recursive(clone, src, dst, credentials)
    , ready
  )
}
