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
    , options

  if(args.help || !args._.length) {
    help(stderr)

    return ready(null, 1)
  }

  pending = args._.length

  options = {
    username: args.username,
    password: args.password,
    recursive: args.recursive,
    internalize: args.internalize,
    log: args.quiet ? null : log
  }

  if(options.username) {
    start()
  } else {
    npm.load(loadAuth)
  }

  function loadAuth() {
    var creds = npm.config.getCredentialsByURI(args.to)
      , parts

    if(creds.username && creds.password) {
      options.username = creds.username
      options.password = creds.password
    } else if(creds.auth) {
      parts = new Buffer(creds.auth, 'base64').toString().split(':')
      options.username = parts[0]
      options.password = parts.slice(1).join(':')
    }

    start()
  }

  function start() {
    args._.forEach(function(xs) {
      run(xs, args.from, args.to, options, onready)
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

  function log(pkg) {
    stdout.write(util.format(
        'cloning %s @ %s...\n'
      , args.nocolor ? pkg.name : ansi.magenta(pkg.name)
      , args.nocolor ? pkg.version : ansi.blue(pkg.version)
    ))
  }
}
