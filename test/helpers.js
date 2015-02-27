var backend = require('unpm-mem-backend')
  , concat = require('concat-stream')
  , tar = require('tar-stream')
  , unpm = require('unpm')
  , zlib = require('zlib')

module.exports.createRegistry = createRegistry
module.exports.getPackageJSON = getPackageJSON
module.exports.getData = getData

function createRegistry(done) {
  var reg = unpm({
      backend: backend()
    , host: {
          hostname: 'localhost'
        , protocol: 'http'
      }
  })

  reg.server.listen(0, function() {
    var port = reg.server.address().port

    reg.config.host.port = port
    done(reg, port)
  })
}

function getData(name, version, registry, done) {
  registry.backend.getMeta(name, gotMeta)

  function gotMeta(err, meta) {
    if(err) {
      return done(err)
    }

    getPackageJSON(
        name
      , version || meta['dist-tags'].latest
      , registry
      , gotPackage
    )

    function gotPackage(data) {
      done(null, {
          json: data
        , meta: meta
      })
    }
  }
}

function getPackageJSON(name, version, registry, done) {
  var packageJSON = null

  registry.backend.getTarball(name, version)
    .pipe(zlib.createGunzip())
    .pipe(tar.extract())
    .on('entry', onEntry)
    .on('finish', finish)

  function onEntry(headers, stream, next) {
    if(headers.name !== 'package/package.json') {
      return next()
    }

    stream.pipe(concat(function concated(data) {
      packageJSON = JSON.parse(data)
      next()
    }))
  }

  function finish() {
    done(packageJSON)
  }
}
