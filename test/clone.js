var backend = require('unpm-mem-backend')
  , concat = require('concat-stream')
  , tar = require('tar-stream')
  , unpm = require('unpm')
  , test = require('tape')
  , zlib = require('zlib')

var clone = require('../index.js')

module.exports = function testClone() {
  test('clone module', cloneModule)
  test('clone version', cloneVersion)
  test('should not blow up if cloning the same thing twice', cloneTwice)
}

function cloneModule(t) {
  createRegistry(4123, function gotReg(reg) {
    var packageJSON = null
      , version

    clone(
        'unpm'
      , 'http://registry.npmjs.org'
      , 'http://localhost:4123'
      , function done(err) {
          t.notOk(err)
          reg.backend.getMeta('unpm', gotMeta)
        }
    )

    function gotMeta(err, data) {
      t.notOk(err, 'should not error')
      t.ok(data, 'should get data')
      t.equal(data.name, 'unpm', 'should have correct metadata')

      version = data['dist-tags'].latest
      getPackageJSON('unpm', version, reg, finish)
    }

    function finish(json) {
      t.ok(json, 'should have found package.json')
      t.equal(json.name, 'unpm', 'should have same name in package.json')
      t.equal(json.version, version, 'should match version in package.json')
      reg.server.close(t.end.bind(t))
    }
  })
}

function cloneVersion(t) {
  createRegistry(4123, function gotReg(reg) {
    var packageJSON = null
      , version

    clone(
        'unpm@1.0.0'
      , 'http://registry.npmjs.org'
      , 'http://localhost:4123'
      , function done() {
          reg.backend.getMeta('unpm', gotMeta)
        }
    )

    function gotMeta(err, data) {
      t.notOk(err, 'should not error')
      t.ok(data, 'should get data')
      t.equal(data.name, 'unpm', 'should have correct metadata')
      getPackageJSON('unpm', '1.0.0', reg, finish)
    }

    function finish(json) {
      t.ok(json, 'should have found package.json')
      t.equal(json.name, 'unpm', 'should have same name in package.json')
      t.equal(json.version, '1.0.0', 'should match version in package.json')
      reg.server.close(t.end.bind(t))
    }
  })
}

function cloneTwice(t) {
  createRegistry(4123, function gotReg(reg) {
    var packageJSON = null
      , remaining = 2
      , version

    clone('unpm', 'http://registry.npmjs.org', 'http://localhost:4123', cloned)
    clone('unpm', 'http://registry.npmjs.org', 'http://localhost:4123', cloned)

    function cloned(err) {
      t.notOk(err, 'should not error')

      if(!--remaining) {
        reg.server.close(t.end.bind(t))
      }
    }
  })
}

function createRegistry(port, done) {
  var reg = unpm({
      backend: backend()
    , host: {
          hostname: 'localhost'
        , port: port
        , protocol: 'http'
      }
  })

  reg.server.listen(port, function() {
    done(reg)
  })
}

function getPackageJSON(name, version, registry, done) {
  var packageJSON = null

  registry.backend.getTarball('unpm', version)
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
