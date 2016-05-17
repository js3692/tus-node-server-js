'use strict';

const BaseHandler = require('./BaseHandler');

class HeadHandler extends BaseHandler {
    /**
     * Send the bytes received for a given file. Attach metadata if available.
     *
     * @param  {object} req     http.incomingMessage
     * @param  {object} res     http.ServerResponse
     * @param  {object} options list of options (onError)
     * @return {Promise}        resolves to {ServerResponse}
     */
    send(req, res, options) {
        const re = new RegExp('\\' + this.store.path + '\\/([\\w\-]+)\/?'); // eslint-disable-line prefer-template
        const match = req.url.match(re);
        if (!match) {
            if (options && options.onError && typeof options.onError === 'function') {
                const err = new Error('Invalid URL');
                err.status = 404;
                return options.onError(err, 404);
            }
            return super.send(res, 404);
        }

        const file_name = match[1];

        return Promise.all([this.store.getOffset(file_name), this.store.getMetadata(file_name)])
            .then((data) => {
                const stats = data[0];
                const metadata = JSON.parse(data[1].toString());
                console.log(metadata);
                // The Server MUST prevent the client and/or proxies from caching the response by adding the Cache-Control: no-store header to the response.
                res.setHeader('Cache-Control', 'no-store');

                // The Server MUST always include the Upload-Offset header in the response for a HEAD request.
                res.setHeader('Upload-Offset', stats.size);

                // If the size of the upload is known, the Server MUST include the Upload-Length header in the response.
                if (metadata.file.entity_length && typeof metadata.file.entity_length === 'number') {
                    res.setHeader('Upload-Length', metadata.file.entity_length);
                }
                delete metadata.file;

                // If an upload contains additional metadata, responses to HEAD requests MUST include the Upload-Metadata header
                // and its value as specified by the Client during the creation.
                if (metadata) {
                    res.setHeader('Upload-Metadata', JSON.stringify(metadata));
                }

                return res.end();
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

module.exports = HeadHandler;
