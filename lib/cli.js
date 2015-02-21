module.exports = cli

var util = require('util')

var parseArgs = require('minimist')
  , npm = require('npm')

var toPackage = require('./to-package.js')
  , cloneAll = require('./clone-all.js')
  , clone = require('./clone.js')
  , help = require('./help.js')

var ansi = require('ansicolors')

function cli(cwd, argv, stdin, stdout, stderr, ready) {
  var aliases = {
      u: 'username'
    , p: 'password'
    , f: 'from'
    , t: 'to'
    , h: 'help'
    , q: ['quiet', 'silent']
    , r: 'recursive'
    , i: 'internalize'
    , n: 'nocolor'
  }

  var args = parseArgs(argv, {alias: aliases})
    , pending
    , run

  args.from = args.f || args.from || 'https://registry.npmjs.org/'

  run = args.recursive
    ? cloneAll.bind(null, args.quiet ? clone : logged, args.internalize)
    : clone

  if(args.help || !args._.length) {
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
      parts = new Buffer(creds.auth, 'base64').toString().split(':')
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
      } : null, onready)
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

    stdout.write(util.format(
        'cloning %s @ %s...\n'
      , args.nocolor ? pkg.name : ansi.magenta(pkg.name)
      , args.nocolor ? pkg.version : ansi.blue(pkg.version)
    ))

    return clone.apply(this, arguments)
  }
}
