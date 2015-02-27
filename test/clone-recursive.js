var concat = require('concat-stream')
  , request = require('hyperquest')
  , tar = require('tar-stream')
  , crypto = require('crypto')
  , test = require('tape')
  , zlib = require('zlib')
  , url = require('url')

var helpers = require('./helpers')
  , clone = require('../index.js')

module.exports = function runTests() {
  test('recursive clone', testRecusive)
  test('recursive clone + internalize', testInternalize)
}

if(require.main === module) {
  module.exports()
}

function testRecusive(t) {
  setup('1.1.0', start)

  function start(err, src, dst) {
    var srcHost = url.format(src.config.host)
      , dstHost = url.format(dst.config.host)

    clone('test-module', srcHost, dstHost, {recursive: true}, cloned)

    function cloned(err) {
      src.server.close(function closed() {
        dst.server.close(verify)
      })
    }

    function verify() {
      helpers.getData('unpm', '1.1.0', dst, function unpmData(err, data) {
        t.equal(data.meta.name, 'unpm', 'name should be expected')
        t.equal(data.meta.name, data.json.name, 'name should match')
        t.equal(data.json.version, '1.1.0', 'version should be expected')
        t.equal(
            data.json.version
          , data.meta['dist-tags'].latest
          , 'version should match'
        )
        t.end()
      })
    }
  }
}

function testInternalize(t) {
  setup(
      'hayes/unpm#v1.1.0'
    , start
  )

  function start(err, src, dst) {
    var srcHost = url.format(src.config.host)
      , dstHost = url.format(dst.config.host)

    clone('test-module', srcHost, dstHost, {
        recursive: true
      , internalize: true
    }, cloned)

    function cloned(err) {
      src.server.close(function closed() {
        if(err) {
          t.fail(err)

          return t.end()
        }

        dst.server.close(verify)
      })
    }

    function verify() {
      var newVersion = '0.0.0-a782bf11d711fe7821b8c0e66d881f30315bfa24'

      helpers.getData('unpm', newVersion, dst, function unpmData(err, data) {
        t.equal(data.meta.name, 'unpm', 'name should be expected')
        t.equal(data.meta.name, data.json.name, 'name should match')
        t.equal(data.json.version, newVersion, 'version should be expected')
        t.equal(
            data.json.version
          , data.meta['dist-tags'].latest
          , 'version should match'
        )

        verifyTestModule()
      })
    }

    function verifyTestModule() {
      var newVersion = '0.0.0-a782bf11d711fe7821b8c0e66d881f30315bfa24'

      helpers.getData('test-module', '1.2.3', dst, unpmData)

      function unpmData(err, data) {
        t.equal(data.meta.name, 'test-module', 'name should be expected')
        t.equal(data.meta.name, data.json.name, 'name should match')
        t.equal(data.json.version, '1.2.3', 'version should be expected')
        t.equal(
            data.json.version
          , data.meta['dist-tags'].latest
          , 'version should match'
        )

        t.deepEqual(data.json.dependencies, {unpm: newVersion})
        t.end()
      }
    }
  }
}

function setup(version, ready) {
  helpers.createRegistry(function gotReg(src, port) {
    helpers.createRegistry(function gotReg(dst, port) {
      populate(src, version, function done(err) {
        ready(err, src, dst)
      })
    })
  })
}

function populate(src, version, done) {
  var host = 'http://localhost:' + src.config.host.port
    , shasum = crypto.createHash('sha1')
    , pack = tar.pack()

  var details = {
      name: 'test-module'
    , version: '1.2.3'
    , dependencies: {
          'unpm': version
      }
  }

  pack.entry({name: 'package/package.json'}, JSON.stringify(details, null, 2))
  pack.finalize()

  var zipped = pack.pipe(zlib.createGzip())

  zipped.pipe(shasum)
  zipped.pipe(concat(gzipped))

  function gzipped(content) {
    var versionData = JSON.parse(JSON.stringify(details))
      , data = JSON.parse(JSON.stringify(details))

    versionData.dist = {shasum: shasum.read().toString('hex')}

    data['dist-tags'] = {latest: data.version}
    data.versions = {}
    data.versions[data.version] = versionData
    data._attachments = {}
    data._attachments[data.name + '-' + data.version + '.tgz'] = {
        'content_type': 'application/octet-stream'
      , 'data': content.toString('base64')
      , 'length': content.length
    }

    data = JSON.stringify(data)

    var options = {
        headers: {
            'content-type': 'application/json'
          , 'content-length': new Buffer(data, 'utf8').length
        }
    }

    var publish = request.put(url.resolve(host, details.name), options)

    publish.pipe(concat(published))
    publish.end(data)
  }

  function published(data) {
    clone('unpm@1.1.0', null, host, {recursive: true}, done)
  }
}
