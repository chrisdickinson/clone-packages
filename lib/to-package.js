module.exports = toPackage

function toPackage(pkg) {
  if(typeof pkg === 'object') {
    return pkg
  }

  var parts = pkg.match(/^(@?[^@]+)(?:@(.*))?$/)

  if(!parts) {
    throw new Error(pkg + 'is not valid package identifier')
  }

  return {
      name: pkg[1]
    , version: pkg[2] || '*'
  }
}
