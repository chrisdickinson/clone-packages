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

function clone(pkg, src, dst, credentials, xform, ready) {
  var sourceRegistry = src
    , targetRegistry = dst

  pkg = typeof pkg === 'string'
    ? toPackage(pkg)
    : pkg

  if(arguments.length === 5) {
    ready = xform
    xform = through()
  } else if(arguments.length === 4) {
    ready = credentials
    credentials = null
    xform = through()
  }

  var shasum = crypto.createHash('sha1')
    , oldSha = crypto.createHash('sha1')
    , transformedTarball = tar.pack()
    , readmeFilename
    , packageHeader
    , newVersion
    , readmeData
    , metadata
    , publish

  var originalTarball = fetch(pkg.name, pkg.version)
    .on('error', onerror)

  transformedTarball.pipe(concat(gzip))
    .on('error', onerror)

  function gzip(data) {
    var out = zlib.createGzip()

    out.pipe(concat(publishPackage))
    out.on('error', onerror)
    out.on('data', function(buf) {
      shasum.update(buf)
    })

    out.write(data)
    out.end()
  }

  var parse = originalTarball
      .on('data', oldSha.update.bind(oldSha))
    .pipe(zlib.createGunzip())
      .on('error', onerror)
    .pipe(tar.extract())
      .on('error', onerror)

  parse.on('entry', onentry)
    .on('error', onerror)
    .on('finish', runXform)

  xform.pipe(concat(updatePackage))
    .on('error', onerror)

  function setReadme(data) {
    readmeData = data.toString()
  }

  function setMetadata(data) {
    metadata = data.toString()
  }

  function onentry(header, stream, done) {
    if(header.name.match(packageRegexp)) {
      packageHeader = header

      return stream.on('end', done)
          .on('error', onerror)
        .pipe(concat(setMetadata))
        .on('error', onerror)
    }

    var filename = header.name.match(readme)

    if(filename) {
      readmeFilename = filename[2]
      stream.pipe(concat(setReadme))
        .on('error', onerror)
    }

    var entry = transformedTarball.entry(header)

    stream.on('end', end)
        .on('error', onerror)
      .pipe(entry)
        .on('error', onerror)

    function end() {
      entry.end()
      done()
    }
  }

  function runXform() {
    if(!metadata) {
      return onerror(new Error('missing package.json'))
    }

    xform.write(metadata)
    xform.end()
  }

  function updatePackage(data) {
    metadata = JSON.parse(data)

    if(pkg.version.match(/[\\\/]/)) {
      newVersion = metadata.version = '0.0.0-' + oldSha.digest('hex')
    }

    var content = new Buffer(
        newVersion ? JSON.stringify(metadata, null, 2) : data
      , 'utf8'
    )

    var entry = transformedTarball.entry({
        name: packageHeader.name
      , size: content.length
    }, finalize)

    entry.write(content)
    entry.end()

    function finalize(err) {
      if(err) {
        return onerror(err)
      }

      transformedTarball.finalize()
    }
  }

  function createMetadata(content) {
    var data = JSON.parse(JSON.stringify(metadata))

    data.name = pkg.name
    data.readme = readmeData
    data.readmeFilename = readmeFilename
    delete data.version

    data.versions = {}
    data.versions[metadata.version] = metadata

    data['dist-tags'] = {'latest': metadata.version}
    data._attachments = {}
    data._attachments[metadata.name + '-' + metadata.version + '.tgz'] = {
        'content_type': 'application/octet-stream'
      , 'data': content.toString('base64')
      , 'length': content.length
    }

    metadata.dist = {shasum: shasum.digest('hex')}

    return data
  }

  function publishPackage(content) {
    content = JSON.stringify(createMetadata(content))
    publish = request.put(url.resolve(
        targetRegistry
      , pkg.name
    ), {headers: buildHeaders(credentials, content)})

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
