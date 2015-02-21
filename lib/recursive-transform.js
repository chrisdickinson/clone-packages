var Buffer = require('buffer').Buffer
  , clone = require('./clone.js')
  , through = require('through')

module.exports = recurse

function recurse(clone, src, dst, _options) {
  var seen = {}
  var options = Object.create(_options)
  options.transform = transform

  return options

  function transform(metadata, done) {
    var deps = getDeps(metadata.dependencies)
      .concat(getDeps(metadata.optionalDependencies))
      .filter(shouldClone)

    var pending = deps.length

    if(!pending) {
      return done(null, metadata)
    }

    deps.forEach(function(dep) {
      clone(
          dep
        , src
        , dst
        , options
        , gotDep.bind(null, dep)
      )
    })

    function gotDep(dep, err, version) {
      if(err) {
        return handleError(err)
      }

      if(version && meatadata.dependencies[dep.name]) {
        meatadata.dependencies[dep.name] = version
      } else if(version && meatadata.optionalDependencies[dep.name]) {
        meatadata.optionalDependencies[dep.name] = version
      }

      if(!--pending) {
        done(null, metadata)
      }
    }

    function handleError(err) {
      var cb = done
      done = Function()
      cb(err)
    }
  }

  function shouldClone(dep) {
    if(seen[dep.id]) {
      return false
    }

    if(!options.internalize && dep.version.match(/[\\\/]/)) {
      return false
    }

    return seen[dep.id] = true
  }
}

function getDeps(deps) {
  if(!deps) {
    return []
  }

  return Object.keys(deps).map(function(name) {
    return {name: name, version: deps[name], id: name + '@' + deps[name]}
  })
}
