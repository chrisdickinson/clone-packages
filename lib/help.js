module.exports = help

function help(stderr) {
/*
clone-packages package@version --from registryurl --to registryurl --recursive

clone npm packages from one registry to another, optionally recursively.

    --from, -f url        registry to clone from. defaults to
                          the public npm registry.

    --to, -t              registry to clone to.

    --recursive, -r       clone all dependencies of `package`,
                          recursively.

    --nocolor, -n         disable coloring of output information.

    --internalize, -i     clone external (git and tarball) deps
                          into the target registry, and update
                          `package`'s dependencies to look for
                          the copy in the registry instead.

    package@version       a package to clone. many packages may
    package               be specified.

*/

  var str = help + ''

  stderr.write(str.slice(str.indexOf('/*') + 3, str.indexOf('*/')) + '\n')
}
