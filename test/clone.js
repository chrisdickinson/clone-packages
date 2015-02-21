var backend = require('unpm-mem-backend')
var concat = require('concat-stream')
var tar = require('tar-stream')
var unpm = require('unpm')
var test = require('tape')
var zlib = require('zlib')

var clone = require('../index.js')

test('clone unpm', function testClone(t) {
  createRegistry(8123, function gotReg(reg) {
    var packageJSON = null
    var version

    clone('unpm', 'http://registry.npmjs.org', 'http://localhost:8123', function done() {
      reg.backend.getMeta('unpm', gotMeta)
    })

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
      t.equal(json.version, version, 'should have same version in package.json')
      reg.server.close(t.end.bind(t))
    }
  })
})

test('clone unpm@1.0.0', function testClone(t) {
  createRegistry(8123, function gotReg(reg) {
    var packageJSON = null
    var version

    clone('unpm@1.0.0', 'http://registry.npmjs.org', 'http://localhost:8123', function done() {
      reg.backend.getMeta('unpm', gotMeta)
    })

    function gotMeta(err, data) {
      t.notOk(err, 'should not error')
      t.ok(data, 'should get data')
      t.equal(data.name, 'unpm', 'should have correct metadata')
      getPackageJSON('unpm', '1.0.0', reg, finish)
    }

    function finish(json) {
      t.ok(json, 'should have found package.json')
      t.equal(json.name, 'unpm', 'should have same name in package.json')
      t.equal(json.version, '1.0.0', 'should have same version in package.json')
      reg.server.close(t.end.bind(t))
    }
  })
})

test('should not blow up if cloning the same thing twice', function testClone(t) {
  createRegistry(8123, function gotReg(reg) {
    var packageJSON = null
    var version

    var remaining = 2

    clone('unpm', 'http://registry.npmjs.org', 'http://localhost:8123', cloned)
    clone('unpm', 'http://registry.npmjs.org', 'http://localhost:8123', cloned)

    function cloned(err) {
      t.notOk(err, 'should not error')
      if(!--remaining) reg.server.close(t.end.bind(t))
    }
  })
})


function createRegistry(port, done) {
  var reg = unpm({
    backend: backend(),
    host: {
      hostname: 'localhost',
      port: port,
      protocol: 'http',
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
      if(headers.name !== 'package/package.json') return next()
      stream.pipe(concat(function concated(data) {
        packageJSON = JSON.parse(data)
        next()
      }))
    }

  function finish() {
    done(packageJSON)
  }
}
