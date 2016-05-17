'use strict';

const BaseHandler = require('./BaseHandler');

class PatchHandler extends BaseHandler {
    /**
     * Write data to the DataStore and return the new offset.
     *
     * @param  {object} req http.incomingMessage
     * @param  {object} res http.ServerResponse
     * @param  {object} options list of options (onSuccess, onError)
     * @return {Promise}        resolves to {ServerResponse}
     */
    send(req, res, options) {
        const re = new RegExp('\\' + this.store.path + '\\/([\\w\-]+)\/?'); // eslint-disable-line prefer-template
        const match = req.url.match(re);
        if (!match) {
            return super.send(res, 404);
        }

        const file_name = match[1];

        const content_type = req.headers['content-type'];
        // All PATCH requests MUST use Content-Type: application/offset+octet-stream.
        if (content_type !== 'application/offset+octet-stream') {
            console.warn(`[PatchHandler] send: Incorrect Content-Type - ${content_type}`);
            return super.send(res, 403);
        }

        // The request MUST include a Upload-Offset header
        let offset = req.headers['upload-offset'];
        offset = parseInt(offset, 10);
        if (isNaN(offset) || offset < 0) {
            console.warn(`[PatchHandler] send: Incorrect Upload-Offset - ${offset}`);
            return super.send(res, 403);
        }

        return this.store.getOffset(file_name)
            .then((stats) => {
                if (stats.size !== offset) {
                    // If the offsets do not match, the Server MUST respond with the 409 Conflict status without modifying the upload resource.
                    console.warn(`[PatchHandler] send: Incorrect offset - ${offset} sent but file is ${stats.size}`);
                    return Promise.reject(409);
                }

                return this.store.write(req, file_name, offset);
            })
            .then((new_offset) => {
                // Handle user defined callback before sending response
                if (options && options.onSuccess && typeof options.onSuccess === 'function') {
                    const successCb = new Promise((resolve, reject) => {
                        try {
                            const directory = this.store.directory || `https://storage.googleapis.com/${this.store.bucket.name}`;
                            options.onSuccess(file_name, directory, resolve);
                        }
                        catch (err) {
                            reject(err);
                        }
                    });

                    return successCb.then(() => Promise.resolve(new_offset));
                }

                return new_offset;
            })
            .then((new_offset) => {
                //  It MUST include the Upload-Offset header containing the new offset.
                const headers = {
                    'Upload-Offset': new_offset,
                };
                // The Server MUST acknowledge successful PATCH requests with the 204
                return super.send(res, 204, headers);
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
}

module.exports = PatchHandler;
