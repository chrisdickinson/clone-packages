var Buffer = require('buffer').Buffer
  , clone = require('./clone.js')
  , through = require('through')

module.exports = recurse

function recurse(clone, from, to, credentials, internalize) {
  var stream = through(write, end)
    , accum = []

  return stream

  function write(buf) {
    accum.push(buf)
  }

  function end() {
    var buf = Buffer.concat(accum)
      , data = JSON.parse(buf)
      , pending

    var deps = getDeps(data.dependencies)
      .concat(getDeps(data.optionalDependencies))

    pending = deps.length

    deps.forEach(function(dep) {
      if(!internalize && data.dependencies[dep].match(/[\\\/]/)) {
        return --pending
      }

      clone(
          dep
        , from
        , to
        , credentials
        , recurse(clone, from, to, credentials, internalize)
        , ondone.bind(null, dep)
      )
    })

    if(!pending) {
      pending = 1
      ondone()
    }

    function ondone(dep, err, version) {
      if(err) {
        return stream.emit('error', err)
      }

      if(version) {
        data.dependencies[dep.name] = version
      }

      --pending

      if(pending) {
        return
      }

      stream.queue(JSON.stringify(data))
      stream.queue(null)
    }
  }
}

function getDeps(deps) {
  if(!deps) {
    return []
  }

  return Object.keys(deps).map(function(name) {
    return {name: name, version: deps[name]}
  })
}
