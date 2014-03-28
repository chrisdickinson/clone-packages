module.exports = toPackage

function toPackage(pkg) {
  if(typeof pkg === 'object') {
    return pkg
  }

  pkg = pkg.split('@')

  return {
      name: pkg[0]
    , version: pkg[1] || '*'
  }
}


