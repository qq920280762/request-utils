'use strict';

const HTTP = require('http');
const QS   = require('querystring');

function Client(params){

    params = params || {};

    this.protocol = params.protocol || HTTP;

    this.host = params.host;
    this.port = params.port;
};

/**
 *
 * @param options
 *          -{string} [options.hostname] 主机名
 *          -{Number} [options.port] 端口 default:80
 *          -{object} [options.headers] 头部信息
 *          -{boolean} [options.expect] 是否使用 100-Continue 协议
 *          -{string} [options.path] 访问路径
 * @param body {object|string} 需要上传的数据
 * @returns {Promise}
 */
Client.prototype.request = (options, body)=> {
    return new Promise((resolve, reject)=> {
        let data = false;
        // Defaults
        options.hostname = options.hostname || options.host || this.host;
        options.port     = options.port || this.port;
        options.headers  = options.headers || {};
        if (options.expect) {
            headers['Expect'] = "100-Continue";
        }
        options.path = options.path || '/';
        if (options.query) {
            options.path += '?' + QS.stringify(options.query);
        }

        if (body) {
            if (typeof body === 'object') {
                try {
                    data = JSON.stringify(body, null, 2);
                    data = Buffer(data);

                    options.headers['Content-Type'] = "application/json";
                    if (!options.headers['Accept'])
                        options.headers['Accept'] = "application/json";

                } catch (e) {
                    reject(e);
                    return;
                }

            }
            else {
                data = Buffer(body + "");
                if (options.headers['Content-Type'])
                    options.headers['Content-Type'] = "text/palin";
            }

            options.headers['Content-Length'] = data.length;
        }

        const req = this.protocol.request(options);
        req.on('error', (err) => {
            reject(err);
        });

        req.on('response', (res) => {
            res.data = [];
            res.on('data', function (trunk) {
                res.data.push(trunk);
            });

            res.on('end', ()=> {
                res.data = Buffer.concat(res.data);
                if (res.headers && res.headers['content-type']
                    && res.headers['content-type'].split(/;/g)[0] === "application/json") {
                    try {
                        res.body = JSON.parse(res.data.toString('utf8'));
                    } catch (e) {
                        reject(e);
                        return;
                    }
                }
                resolve(res);
            });
        });

        if (data) {
            if (options.expect) {
                req.on('continue', () => {
                    req.write(data);
                    req.end();

                });

            }
            else {
                req.write(data);
                req.end();
            }
        }
        else {
            req.end();
        }
    });
};

Client.prototype.get = (path, options) => {
    if (typeof options !== 'object') {
        options = {};
    }
    options.path   = path;
    options.method = "GET";
    return Client.request(options, null);
};

Client.prototype.post = (path, body, options) => {
    if (typeof options !== 'object') {
        options = {};
    }
    options.path   = path;
    options.method = "POST";
    return Client.request(options, body);
};

Client.prototype.put = (path, body, options) => {
    if (typeof options !== 'object') {
        options = {};
    }

    options.path   = path;
    options.method = "PUT";
    return Client.request(options, body);
};

Client.prototype['delete'] = (path, options) => {
    if (typeof options !== 'object') {
        options = {};
    }

    options.path   = path;
    options.method = "DELETE";
    return Client.request(options, null);
};

module.exports = Client;
