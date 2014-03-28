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

// grab just this package:
clone('jsl@1.1.0', 'http://registry.npmjs.org/', 'http://my.reg/', function(err) {

})

// grab this package + its deps:
clone.all('jsl@1.1.0', 'http://registry.npmjs.org/', 'http://my.reg/', function(err) {

})
```

## API

#### clone(package, sourceRegistry, targetRegistry, credentials, ready)
#### clone.all(package, sourceRegistry, targetRegistry, credentials, ready)

`package` may be an object: `{name: "packageName", version: "version"}`, or a string: `"package"`, `"package@1.1.1"`.

`sourceRegistry` and `targetRegistry` must be strings representing URLs of the respective target registries.

`credentials` is optional, and used in the publish step for the **target** registry only. If given, it may either
be a string (passed on verbatim during basic auth) or a `{username, password}` object.

## License

MIT
