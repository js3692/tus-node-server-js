'use strict';

const File = require('../models/File');
const BaseHandler = require('./BaseHandler');

class PostHandler extends BaseHandler {
    /**
     * Create a file in the DataStore.
     *
     * @param  {object} req http.incomingMessage
     * @param  {object} res http.ServerResponse
     * @param  {object} options list of options (filename, url, onSuccess, onError)
     * @return {function}
     */
    send(req, res, options) {
        let length = req.headers['upload-length'];
        const deferred_length = req.headers['upload-defer-length'];
        // The request MUST include a Upload-Length or Upload-Defer-Length header
        if (!length && !deferred_length) {
            return super.send(res, 400, { 'Content-Type': 'text/plain' }, 'Upload-Length or Upload-Defer-Length required');
        }

        length = parseInt(length, 10);
        // The value MUST be a non-negative integer.
        if (isNaN(length) || length < 0) {
            return super.send(res, 400, { 'Content-Type': 'text/plain' }, 'Upload-Length must be non-negative');
        }

        length = parseInt(length, 10);
        // The Upload-Defer-Length value MUST be 1.
        if (deferred_length && deferred_length !== '1') {
            return super.send(res, 400, { 'Content-Type': 'text/plain' }, 'Upload-Defer-Length must be 1');
        }

        const fileOperationPromises = [];
        const file = new File(length);

        if (options.filename) {
            // If filename is provided by the server, then it should override the random id
            file.id = options.filename;
        }

        if (req.headers['upload-metadata']) {
            const metadata = this._normalizeMetadata(req.headers['upload-metadata']);
            console.log(metadata);

            // The client should have provided a filename as specified in the
            // protocol, but check again to make sure. Also check if the server
            // specified a filename, in which case the metadata filename should
            // not be used.
            if (metadata.filename && !options.filename) {
                file.id = metadata.filename;
            }

            // Now store the metadata for later use in responses to HEAD requests.
            fileOperationPromises.push(this.store.saveMetadata(file.id));
        }

        fileOperationPromises.push(this.store.create(file));

        const url = `http://${req.headers.host}${this.store.path}/${file.id}`;
        return Promise.all(fileOperationPromises)
            .then(() => {
                if (options && options.onSuccess && typeof options.onSuccess === 'function') {
                    const successCb = new Promise((resolve, reject) => {
                        try {
                            const directory = this.store.directory || `https://storage.googleapis.com/${this.bucket.name}`;
                            options.onSuccess(file.id, directory, resolve);
                        }
                        catch (err) {
                            reject(err);
                        }
                    });

                    return successCb;
                }

                return null;
            })
            .then(() => {
                return super.send(res, 201, { Location: url });
            })
            .catch((error) => {
                if (Number.isInteger(error)) {
                    return super.send(res, error);
                }

                if (options && options.onError && typeof options.onError === 'function') {
                    error.status = 500;
                    return options.onError(error, 500);
                }

                return super.send(res, 500);
            });
    }

    /**
     * Normalize metadata
     *
     * @param   {string} metadata
     * @return  {object}
     */
    _normalizeMetadata(metadata) {
        if (!metadata) {
            return null;
        }

        const normalizeCommas = metadata.replace(', ', ',').replace(' ,', ',');

        const dataArray = normalizeCommas.split(',').map((data) => data.split(' '));

        const cleanedMetadata = {};
        for (const data of dataArray) {
            const dataBuffer = new Buffer(data[1], 'base64');
            cleanedMetadata[data[0]] = dataBuffer.toString();
        }

        return cleanedMetadata;
    }
}

module.exports = PostHandler;
