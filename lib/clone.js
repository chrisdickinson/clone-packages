var concat = require('concat-stream')
  , request = require('hyperquest')
  , fetch = require('npm-fetch')
  , through = require('through')
  , tar = require('tar-stream')
  , crypto = require('crypto')
  , zlib = require('zlib')
  , url = require('url')

var buildHeaders = require('./build-headers.js')
  , toPackage = require('./to-package.js')

var readme = /^([^\/]+)\/(readme(\.(md|rst|mkd|markdown|txt)))?$/i
  , packageRegexp = /^[^\/]+\/package\.json$/i

module.exports = clone

function clone(pkg, src, dst, options, ready) {
  pkg = typeof pkg === 'string' ? toPackage(pkg) : pkg

  if(options.log) {
    options.log(pkg)
  }

  var shasum = crypto.createHash('sha1')
    , oldSha = crypto.createHash('sha1')
    , transformedTarball = tar.pack()
    , parsing = 1
    , readmeFilename
    , packageHeader
    , newVersion
    , readmeData
    , metadata
    , publish

  var originalTarball = fetch(pkg.name, pkg.version, {registry: src})
    .on('error', onerror)

  var gzipStream = transformedTarball
    .pipe(zlib.createGzip())
      .on('error', onerror)

  gzipStream.pipe(shasum)
  gzipStream.pipe(concat(publishPackage))

  originalTarball.pipe(oldSha)

  var parse = originalTarball
    .pipe(zlib.createGunzip())
      .on('error', onerror)
    .pipe(tar.extract())
      .on('error', onerror)

  parse
    .on('entry', onentry)
    .on('error', onerror)
    .on('finish', runXform)

  function setReadme(data) {
    readmeData = data.toString()
    runXform()
  }

  function setMetadata(data) {
    metadata = data.toString()
    runXform()
  }

  function onentry(header, stream, done) {
    // normalize tar root name
    header.name = header.name.replace(/^([^\/]*)/, 'package')

    if(header.name.match(packageRegexp)) {
      packageHeader = header
      parsing++

      return stream.on('end', done)
          .on('error', onerror)
        .pipe(concat(setMetadata))
          .on('error', onerror)
    }

    var filename = header.name.match(readme)

    if(filename) {
      parsing++
      readmeFilename = filename[2]
      stream.pipe(concat(setReadme))
        .on('error', onerror)
    }

    stream.pipe(transformedTarball.entry(header, done))
  }

  function runXform() {
    if(--parsing) {
      return
    }

    if(!metadata) {
      return onerror(new Error('missing package.json'))
    }

    if(options.transform) {
      options.transform(JSON.parse(metadata), updatePackage)
    } else {
      updatePackage(null, JSON.parse(metadata))
    }
  }

  function updatePackage(err, data) {
    if(err) {
      return onerror(err)
    }

    if(pkg.version.match(/[\\\/]/)) {
      newVersion = data.version = '0.0.0-' + oldSha.read().toString('hex')
    }

    metadata = data

    var content = new Buffer(JSON.stringify(data, null, 2), 'utf8')

    var entry = transformedTarball.entry({
        name: packageHeader.name
      , size: content.length
    }, finalize)

    entry.end(content)

    function finalize(err) {
      if(err) {
        return onerror(err)
      }

      transformedTarball.finalize()
    }
  }

  function createMetadata(content) {
    var data = JSON.parse(JSON.stringify(metadata))

    metadata.dist = {shasum: shasum.read().toString('hex')}
    data.name = pkg.name
    data.readme = readmeData
    data.readmeFilename = readmeFilename
    delete data.version

    data.versions = {}
    data.versions[metadata.version] = metadata

    data['dist-tags'] = {'latest': metadata.version}
    data._attachments = {}
    data._attachments[data.name + '-' + metadata.version + '.tgz'] = {
        'content_type': 'application/octet-stream'
      , 'data': content.toString('base64')
      , 'length': content.length
    }

    return data
  }

  function publishPackage(content) {
    content = JSON.stringify(createMetadata(content))
    publish = request.put(
        url.resolve(dst, pkg.name)
      , {headers: buildHeaders(options, content)}
    )

    publish
      .on('error', onerror)
      .pipe(concat(onfinish))
      .on('error', onerror)

    publish.end(content)
  }

  function onfinish() {
    var responseOkay = publish.response.statusCode > 199 &&
      publish.response.statusCode < 300

    if(!responseOkay) {
      // conflict means "it's already up there, dude."
      if(publish.response.statusCode === 409) {
        return ready(null, newVersion)
      }

      return onerror(
          new Error('publish error: ' + publish.response.statusCode)
      )
    }

    return ready(null, newVersion)
  }

  function onerror(err) {
    var cb = ready

    ready = Function()
    cb(err)
  }
}
