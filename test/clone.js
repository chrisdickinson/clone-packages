var test = require('tape')

var clone = require('../index.js')
  , helpers = require('./helpers')

module.exports = function testClone() {
  test('clone module', cloneModule)
  test('clone scoped module', cloneScoped)
  test('clone version', cloneVersion)
  test('should not blow up if cloning the same thing twice', cloneTwice)
}

if(require.main === module) {
  module.exports()
}

function cloneModule(t) {
  helpers.createRegistry(function gotReg(reg, port) {
    var packageJSON = null
      , version

    clone(
        'unpm'
      , 'http://registry.npmjs.org'
      , 'http://localhost:' + port
      , function done(err) {
          t.notOk(err)
          helpers.getData('unpm', null, reg, finish)
        }
    )

    function finish(err, data) {
      t.notOk(err, 'should not error')
      t.ok(data, 'should get data')
      t.equal(data.meta.name, 'unpm', 'should have correct metadata')
      t.ok(data.json, 'should have found package.json')
      t.equal(data.json.name, 'unpm', 'should have same name in package.json')
      t.equal(
          data.json.version
        , data.meta['dist-tags'].latest
        , 'should match version in package.json'
      )
      reg.server.close(t.end.bind(t))
    }
  })
}

function cloneScoped(t) {
  helpers.createRegistry(function gotReg(reg, port) {
    var packageJSON = null
      , version

    clone(
        '@kgryte/noop'
      , 'http://registry.npmjs.org'
      , 'http://localhost:' + port
      , function done(err) {
          t.notOk(err)
          helpers.getData('unpm', null, reg, finish)
        }
    )

    function finish(err, data) {
      t.notOk(err, 'should not error')
      t.ok(data, 'should get data')
      t.equal(data.meta.name, '@kgryte/noop', 'should have correct metadata')
      t.ok(data.json, 'should have found package.json')
      t.equal(data.json.name, '@kgryte/noop', 'same name in package.json')
      t.equal(
          data.json.version
        , data.meta['dist-tags'].latest
        , 'should match version in package.json'
      )
      reg.server.close(t.end.bind(t))
    }
  })
}

function cloneVersion(t) {
  helpers.createRegistry(function gotReg(reg, port) {
    var packageJSON = null
      , version

    clone(
        'unpm@1.0.0'
      , 'http://registry.npmjs.org'
      , 'http://localhost:' + port
      , function done(err) {
          t.notOk(err)
          helpers.getData('unpm', '1.0.0', reg, finish)
        }
    )

    function finish(err, data) {
      t.notOk(err, 'should not error')
      t.ok(data, 'should get data')
      t.equal(data.meta.name, 'unpm', 'should have correct metadata')
      t.ok(data.json, 'should have found package.json')
      t.equal(data.json.name, 'unpm', 'should have same name in package.json')
      t.equal(
          data.json.version
        , '1.0.0'
        , 'should match version in package.json'
      )
      reg.server.close(t.end.bind(t))
    }
  })
}

function cloneTwice(t) {
  helpers.createRegistry(function gotReg(reg, port) {
    var packageJSON = null
      , remaining = 2
      , version

    clone(
        'unpm'
      , 'http://registry.npmjs.org'
      , 'http://localhost:' + port
      , cloned
    )
    clone(
        'unpm'
      , 'http://registry.npmjs.org'
      , 'http://localhost:' + port
      , cloned
    )

    function cloned(err) {
      t.notOk(err, 'should not error')

      if(!--remaining) {
        reg.server.close(t.end.bind(t))
      }
    }
  })
}
