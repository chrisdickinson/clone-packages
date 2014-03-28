var Buffer = require('buffer').Buffer
  , clone = require('./clone.js')
  , through = require('through')

module.exports = recurse

function recurse(clone, from, to, credentials) {
  var stream = through(write, end)
    , accum = []

  return stream

  function write(buf) {
    accum.push(buf)
  }

  function end() {
    var buf = Buffer.concat(accum)
      , data = JSON.parse(buf)

    var deps = Object.keys(data.dependencies || {})
      , pending = deps.length

    deps.forEach(function(dep) {
      clone(
          dep + '@' + data.dependencies[dep]
        , from
        , to
        , credentials
        , recurse(clone, from, to, credentials)
        , ondone
      )
    })

    if(!pending) {
      pending = 1
      ondone()
    }

    function ondone(err) {
      if(err) {
        return stream.emit('error', err)
      }

      --pending

      if(pending) {
        return
      }

      stream.queue(buf)
      stream.queue(null)
    }
  }
}
