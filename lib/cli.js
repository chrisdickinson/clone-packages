module.exports = cli

var parseArgs = require('minimist')

var toPackage = require('./to-package.js')
  , cloneAll = require('./clone-all.js')
  , clone = require('./clone.js')
  , help = require('./help.js')
  , npm = require('npm')

var ansi = require('ansicolors')

function cli(cwd, argv, stdin, stdout, stderr, ready) {
  var args = parseArgs(argv)
    , pending
    , run

  args.recursive = args.r || args.recursive
  args.from = args.f || args.from || 'https://registry.npmjs.org/'
  args.to = args.t || args.to

  args.username = args.u || args.username
  args.password = args.p || args.password
  args.quiet = args.q || args.silent || args.shh

  run = args.recursive
    ? cloneAll.bind(null, args.quiet ? clone : logged)
    : clone

  if(args.h || args.help || !args._.length) {
    help(stderr)

    return ready(null, 1)
  }

  pending = args._.length

  if(args.username) {
    start()
  } else {
    npm.load(loadAuth)
  }

  function loadAuth() {
    var creds = npm.config.getCredentialsByURI(args.to)
      , parts

    if(creds.username && creds.password) {
      args.username = creds.username
      args.password = creds.password
    } else if(creds.auth) {
      parts = new Buffer(reds.auth, 'base64').toString().split(':')
      args.username = parts[0]
      args.password = parts.slice(1).join(':')
    }

    start()
  }

  function start() {
    args._.forEach(function(xs) {
      run(xs, args.from, args.to, args.username ? {
            username: args.username
          , password: args.password
      } : null, null, onready)
    })
  }

  function onready(err) {
    if(err) {
      var cb = ready

      ready = Function()

      return cb(err)
    }

    !--pending && ready(null, 0)
  }

  function logged(pkg) {
    pkg = toPackage(pkg)

    stdout.write('cloning ' +
        ansi.magenta(pkg.name) +
        ' @ ' + ansi.blue(pkg.version) + '...\n'
    )

    return clone.apply(this, arguments)
  }
}
