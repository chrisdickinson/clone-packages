var Buffer = require('buffer').Buffer

module.exports = buildHeaders

function buildHeaders(credentials, content) {
  var out = {
      'content-type': 'application/json'
    , 'content-length': new Buffer(content, 'utf8').length
  }

  insertAuth(out, credentials)

  return out
}

function insertAuth(into, credentials) {
  if(!credentials) {
    return
  }

  into.authorization = typeof credentials === 'string' ?
      'Basic ' + credentials :
      'Basic ' + new Buffer(credentials.username + ':' + credentials.password)
        .toString('base64')
}

