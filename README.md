# tus-node-server
Fork of [tus-node-server](https://github.com/tus/tus-node-server), with edits from my own work in [tus-express](https://github.com/nuntio/tus-express) added.

[tus](http://tus.io/) is a new open protocol for resumable uploads built on HTTP. This is the [tus protocol 1.0.0](http://tus.io/protocols/resumable-upload.html) node.js server implementation. This repo is adapted to fit some use cases in [Express](http://expressjs.com/). Feel free to let me know if you have any comments or feedback!

## Options
You can provide a list of options to the handler functions:
  - HEAD allows 'onError'
  - PATCH allows 'onSuccess', 'onError'.
  - POST allows 'filename', 'onSuccess', 'onError'

#### Example
```javascript
[...]
const tus = require('tus-node-server');
const server = new tus.Server();
server.datastore = new tus.FileStore({
  directory: 'files/videos/user-uploads',
  path: '/api/videos/tus-upload'
});

var app = express();

app.post('/api/videos/tus-upload', function(req, res) {
  server.handle(req, res, {
    filename: '50554d63-29bb-11e5-b345-feff819cdc9f',
    onSuccess (fileName, filePath, done) {
      Users.save({ user: req.user, uploads: [filePath] });

      // 'done' MUST be called.
      done();
    }
  });
});

app.all('/api/videos/tus-upload/*', function(req, res) {
  server.handle(req, res, {
    onError (err, statusCode) {
      console.error(err);

      // The response must be ended if
      // using a custom error handler.
      // If a custom error handler is not
      // defined for a handler, tus-node-server
      // will end the response and take care
      // of the status codes consistent with
      // the protocol.
      res.sendStatus(statusCode);
    }
  });
});

[...]
```

## Use Cases

- [Build a standalone server](#case-1) (in original repo)
- [Deploy tus-node-server as Express middleware](#case-2) (in original repo)
- [Custom file directories](#case-3) (in original repo)
- [Custom file names](#case-4) (new)
- [Execute callbacks](#case-5) (new)
- [Use 'Upload-Metadata' header](#case-6) (new)

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

#### <a name="case-3"></a>Custom file directories

Specify a directory to save your files. If 'directory' is not specified, then FileStore will just use 'path' as the file directory, saving uploads to `/your/project/directory/api/videos/tus-upload`.

```javascript
[...]

const tus = require('tus-node-server');
const server = new tus.Server();
server.datastore = new tus.FileStore({
  directory: 'files/videos/user-uploads',
  path: '/api/videos/tus-upload'
});

var app = express();

app.all('/api/videos/tus-upload/*', function(req, res) {
  server.handle(req, res);
});

[...]
```

#### <a name="case-4"></a>Custom file names

It may sometimes be necessary to use a custom file name to stay consistent with other parts of your application. Now you can pass in the filename when creating a new file.

```javascript
[...]

const tus = require('tus-node-server');
const server = new tus.Server();
server.datastore = new tus.FileStore({
  directory: 'files/videos/user-uploads',
  path: '/api/videos/tus-upload'
});

var app = express();

app.post('/api/videos/tus-upload', function(req, res) {
  server.handle(req, res, {
    filename: '50554d63-29bb-11e5-b345-feff819cdc9f'
  });
});

app.all('/api/videos/tus-upload/*', function(req, res) {
  server.handle(req, res);
});

[...]
```

#### <a name="case-5"></a>Execute callbacks

You may want to provide callbacks to execute stuff when the main operations are over.

```javascript
[...]

app.patch('/api/videos/tus-upload/:fileId', function(req, res) {
  server.handle(req, res, {
    onSuccess (fileName, filePath, done) {
      // Do stuff here

      // 'done' MUST be called.
      done();
    }
  });
});

app.all('/api/videos/tus-upload/*', function(req, res) {
  server.handle(req, res);
});

[...]
```

#### <a name="case-6"></a>Use 'Upload-Metadata' header

The client can send an 'Upload-Metadata' header to send miscellaneous metadata (like filenames). See [here](http://tus.io/protocols/resumable-upload.html#upload-metadata) for more details.

```
$ curl -X POST -I 'http://localhost:1337/files/' \
               -H 'Tus-Resumable: 1.0.0' \
               -H 'Upload-Length: 55109624' \
               -H 'Upload-Metadata: filename bXktY29vbC12aWRlbw=='

HTTP/1.1 201 Created
Tus-Resumable: 1.0.0
Location: http://localhost:1337/files/my-cool-video

$ curl -X HEAD -I 'http://localhost:1337/files/my-cool-video' \
               -H 'Tus-Resumable: 1.0.0'
HTTP/1.1 200 OK
Tus-Resumable: 1.0.0
Upload-Offset: 0
Upload-Length: 55109624
Upload-Metadata: {"filename":"my-cool-video"}
```
