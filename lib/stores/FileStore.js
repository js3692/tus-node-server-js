'use strict';

const DataStore = require('./DataStore');
const fs = require('fs');
const MASK = '0777';
const IGNORED_MKDIR_ERROR = 'EEXIST';
const FILE_DOESNT_EXIST = 'ENOENT';

/**
 * @fileOverview
 * Store using local filesystem.
 *
 * @author Ben Stahl <bhstahl@gmail.com>
 */

class FileStore extends DataStore {
    constructor(options) {
        super(options);

        this.directory = options.directory || options.path.replace(/^\//, '');

        this.extensions = ['creation'];
        this._checkOrCreateDirectory();
    }

    /**
     *  Ensure the directory exists.
     */
    _checkOrCreateDirectory() {
        fs.mkdir(this.directory, MASK, (error) => {
            if (error && error.code !== IGNORED_MKDIR_ERROR) {
                throw error;
            }
        });
    }

    /**
     * Create an empty file.
     *
     * @param  {File} file
     * @return {Promise}
     */
    create(file) {
        super.create(file);
        return new Promise((resolve, reject) => {
            fs.open(`${this.directory}/${file.id}`, 'w', (err, fd) => {
                if (err) {
                    console.log(err);
                    reject(err);
                }

                fs.close(fd, (exception) => {
                    if (exception) {
                        reject(exception);
                    }

                    resolve();
                });
            });
        });
    }

    /**
     * Write to the file, starting at the provided offset
     *
     * @param  {object} req http.incomingMessage
     * @param  {string} file_name   Name of file
     * @param  {integer} offset     starting offset
     * @return {Promise}
     */
    write(req, file_name, offset) {
        return new Promise((resolve, reject) => {
            const path = `${this.directory}/${file_name}`;
            const options = {
                flags: 'r+',
                start: offset,
            };

            const stream = fs.createWriteStream(path, options);

            if (!stream) {
                reject(500);
            }

            let new_offset = 0;
            req.on('data', (buffer) => {
                new_offset += buffer.length;
            });

            req.on('end', () => {
                console.info(`[FileStore] write: ${new_offset} bytes written to ${path}`);
                offset += new_offset;
                console.info(`[FileStore] write: File is now ${offset} bytes`);
                resolve(offset);
            });

            stream.on('error', (e) => {
                console.warn('[FileStore] write: Error', e);
                reject(500);
            });

            req.pipe(stream);
        });
    }

    /**
     * Return file stats, if they exits
     *
     * @param  {string} file_name name of the file
     * @return {object}           fs stats
     */
    getOffset(file_name) {
        return new Promise((resolve, reject) => {
            const file_path = `${this.directory}/${file_name}`;
            fs.stat(file_path, (error, stats) => {
                if (error && error.code === FILE_DOESNT_EXIST) {
                    console.warn(`[FileStore] getOffset: No file found at ${file_path}`);
                    reject(404);
                }

                if (error) {
                    console.warn(error);
                    reject(error);
                }

                resolve(stats);
            });
        });
    }

    /**
     * Save the metadata.
     *
     * @param  {string} file_name   filename
     * @param  {object} metadata    filename
     * @return {Promise}
     */
    saveMetadata(file_name, metadata) {
        super.saveMetadata(file_name, metadata);
        const file_path = `${this.directory}/${file_name}.json`;
        return new Promise((resolve, reject) => {
            fs.writeFile(file_path, JSON.stringify(metadata), (err) => {
                if (err) {
                    reject(err);
                }

                resolve();
            });
        });
    }

    /**
     * Return metadata, if it exits
     *
     * @param  {string} file_name name of the file
     * @return {Promise}          resolves to metadata
     */
    getMetadata(file_name) {
        const file_path = `${this.directory}/${file_name}.json`;
        return new Promise((resolve, reject) => {
            fs.readFile(file_path, (err, metadata) => {
                if (err) {
                    reject(err);
                }

                resolve(metadata);
            });
        });
    }
}

module.exports = FileStore;
