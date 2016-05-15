# tus-node-server (fork of [tus-node-server](https://github.com/tus/tus-node-server))

tus is a new open protocol for resumable uploads built on HTTP. This is the [tus protocol 1.0.0](http://tus.io/protocols/resumable-upload.html) node.js server implementation

**Adapted to fit some use cases in [Express](http://expressjs.com/). Feel free to let me know if you have any comments / feedback!

## Use Cases

- [Build a standalone server](#case-1)(in original repo)
- [Deploy tus-node-server as Express middleware](#case-2)(in original repo)
- [Custom file paths](#case-3)(new)
- [Use callbacks](#case-4)(new)
- [Implement 'Upload-Metadata' from client](#case-5)(new)

#### <a name="case-1"></a>Build a standalone server
```javascript
const tus = require('tus-node-server');

const server = new tus.Server();
server.datastore = new tus.FileStore({
    path: '/files'
});

const host = '127.0.0.1';
const port = 8000;
server.listen({ host, port }, () => {
    console.log(`[${new Date().toLocaleTimeString()}] tus server listening at http://${host}:${port}`);
});
```

#### <a name="case-2"></a>Alternatively, you could deploy tus-node-server as [Express Middleware](http://expressjs.com/en/guide/using-middleware.html)

```javascript
const tus = require('tus-node-server');
const server = new tus.Server();
server.datastore = new tus.FileStore({
    path: '/files'
});

var app = express();
app.all('/files/*', function(req, res) {
  server.handle(req, res);
});
app.listen(port, host);
```

#### <a name="case-3"></a>Custom file paths

#### <a name="case-4"></a>Perform custom operations

#### <a name="case-5"></a>Implement 'Upload-Metadata' from client