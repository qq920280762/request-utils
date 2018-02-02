'use strict';

const HTTP = require('http');
const net = require('net');
const QS   = require('querystring');
const zlib = require('zlib');

class Client {

    constructor(params) {

        params = params || {};

        this.protocol = params.protocol || HTTP;
        this.hostname = params.hostname;
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
    request(options, body){
        return new Promise((resolve, reject)=> {
            let data = false;
            // Defaults
            options.hostname = options.hostname || this.hostname;
            options.host     = options.host || this.host;
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

                            let encoding = res.headers['content-encoding'];

                            if ('gzip' == encoding) {
                                zlib.gunzip(res.data,function(err,decoded){

                                    if(err){
                                        reject(err);
                                    }
                                    else{
                                        res.body = JSON.parse(decoded.toString());
                                        resolve(res);
                                    }
                                });
                            }
                            if ('deflate' == encoding) {
                                zlib.inflate(res.data, function (err, decoded) {
                                    res.responseText = decoded.toString();
                                    if(err){
                                        reject(err);
                                    }
                                    else{
                                        res.body = JSON.parse(decoded.toString());
                                        resolve(res);
                                    }
                                });
                            }
                        } catch (e) {
                            reject(e);
                        }
                    }
                    else{
                        resolve(res);
                    }
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

    get(path, options){
        if (typeof options !== 'object') {
            options = {};
        }
        options.path   = path;
        options.method = "GET";
        return this.request(options, null);
    };

    post(path, body, options){
        if (typeof options !== 'object') {
            options = {};
        }
        options.path   = path;
        options.method = "POST";
        return this.request(options, body);
    };

    put(path, body, options){
        if (typeof options !== 'object') {
            options = {};
        }

        options.path   = path;
        options.method = "PUT";
        return this.request(options, body);
    };

    delete(path, options){
        if (typeof options !== 'object') {
            options = {};
        }

        options.path   = path;
        options.method = "DELETE";
        return this.request(options, null);
    };


    request_socket(hostname,port,msg) {

        return new Promise((resolve,reject)=>{

            let client = new net.Socket();

            client.connect(port, hostname, function () {

                client.write(msg);
            });


            client.on('data', function (data) {

                let datas = [];

                datas.push(data);

                let buff   = Buffer.concat(datas, data.length);

                let result = buff.toString();

                result     = JSON.parse(result);

                resolve(result);

                // 完全关闭连接
                client.destroy();
            });

            client.on('error', function (err) {

                reject(err);
            });

            client.on('close', function () {

            });

        });
    }



}

module.exports = Client;
