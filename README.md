# clone-packages

clone packages from one npm registry to another, optionally recursively.

```bash
# in bash:
$ npm install -g clone-packages
$ clone-packages beefy browserify@3.x.x --to http://my.registry.us/ --recursive
# ... time passes and your modules are cloned!
```

or programmatically:

```javascript
var clone = require('clone-packages')

// grab this package:
clone('jsl@1.1.0', 'http://registry.npmjs.org/', 'http://my.reg/', {}, done)

function done(err) {
  // once cloning is complete
}
```

## API

#### clone(package, sourceRegistry, targetRegistry, options, ready)

`package` may be an object: `{name: "packageName", version: "version"}`, or a string: `"package"`, `"package@1.1.1"`.

`sourceRegistry` and `targetRegistry` must be strings representing URLs of the respective target registries.

`options` is an object allowing the following keys:

* `username` used to authenticate in the publish step for the **target** registry.
* `password` used with `username` to authenticate.
* `recursive` clone all dependencies of `package`
* `internalize` move all packages with external dependencies into the target registry.
* `log` a function that will be called with every processed package.

`ready` is a callback that will be called once cloning has completed.

## License

MIT
