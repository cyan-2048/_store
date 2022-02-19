/*
 * Copyright (C) 2021 Affe Null <affenull2345@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const https = require('https');
const zlib = require('zlib');
const hawk = require('hawk');

function generateLoginHash(auth){
  return {
    email: auth.username,
    password: auth.password // TODO - Hash password
  };
}

module.exports = class Requester {
  constructor(auth, api, dev, onerror, onload){
    this.auth = auth;
    this.api = api;
    this.dev = dev;
    this.onerror = onerror;
    this.onload = onload;
    switch(auth.method){
      case 'api-key':
        this.send({
          method: 'POST',
          data: {
            brand: dev.brand,
            device_id: dev.imei,
            device_type: dev.type,
            model: dev.model,
            os: dev.os,
            os_version: dev.version,
            reference: dev.cu
          },
          path: '/v3.0/applications/' + api.app.id + '/tokens',
          headers: {
            'Authorization': 'Key ' + auth.key
          },
          type: 'json'
        }).then(token => {
          this.token = token;
          this.onload();
        }).catch(e => {
          this.onerror(e);
        });
        break;
      case 'account':
        this.onerror(new Error('Login method not implemented'));
        return;
        // Dead code which might be needed again in the future
        let { email, password } = generateLoginHash(auth);
        this.send({
          method: 'POST',
          data: {
            device: {
              brand: dev.brand,
              device_id: dev.imei,
              device_type: dev.type,
              model: dev.model,
              os: dev.os,
              os_version: dev.version,
              reference: dev.cu
            },
            application: {
              id: api.app.id
            },
            grant_type: 'password',
            password: password,
            scope: 'core',
            user_name: email
          },
          path: '/v3.0/tokens',
          type: 'json'
        }).then(token => {
          this.token = token;
          this.onload();
        }).catch(e => {
          this.onerror(e);
        });
        break;
      case 'token':
        this.token = {
          kid: auth.kid,
          mac_key: auth.key
        };
        this.onload();
        break;
      default:
        this.onerror(new Error('Unknown authentication method: ' +
          auth.method));
        break;
    }
  }
  send(req){
    return new Promise((resolve, reject) => {
      if(!req.path)
        reject(new TypeError('request missing path'));
      else if(!req.method)
        reject(new TypeError('request missing method'));
      else {
        let options = {
          method: req.method,
          headers: {}
        };
        let path = req.path;
        let payload = ['POST', 'PUT'].includes(req.method) ? (
          (req.contentType && req.contentType !== 'application/json') ?
          req.data : JSON.stringify(req.data)
        ) : null;
        let hawkinfo;
        if(path[0] === '/'){
          path = this.api.server.url + path;
        }

        if('object' === typeof req.headers){
          Object.keys(req.headers).forEach(name => {
            options.headers[name] = req.headers[name];
          });
        }
        options.headers['Kai-API-Version'] = this.api.ver;
        options.headers['Kai-Request-Info'] =
          'ct="wifi", rt="auto", utc="' +
          Date.now() + '", utc_off="1", ' +
          'mcc="' + this.dev.mcc + '", ' +
          'mnc="' + this.dev.mnc + '", ' +
          'net_mcc="null", ' +
          'net_mnc="null"';
        options.headers['Kai-Device-Info'] =
          'imei="' + this.dev.imei + '", curef="' + this.dev.cu + '"';
        options.headers['User-agent'] = this.dev.ua;
        options.headers['Content-type'] = req.contentType || 'application/json';
        if(this.token){
          hawkinfo = {
            credentials: {
              id: this.token.kid,
              algorithm: 'sha256',
              key: Buffer.from(this.token.mac_key, 'base64')
            }
          };
          if(payload){
            hawkinfo.payload = payload;
            hawkinfo.contentType = req.contentType || 'application/json';
          }
          options.headers['Authorization'] =
            hawk.client.header(path, req.method, hawkinfo).header;
        }
        let hreq = https.request(path, options, res => {
          let chunks = [];
          res.on('data', chunk => {
            chunks.push(chunk);
          });
          function handleData(data){
            let msg = '';
            if(res.statusCode < 200 || res.statusCode >= 300){
              try {
                let error = JSON.parse(data.toString());
                msg = ' ' + error.desc + ': ' + error.cause;
              } catch(e) {
                // Avoid extremely long messages
                msg = ' ' + data.slice(0, 256).toString();
              }
              reject('request error ' + res.statusCode + ' ' + msg);
            }
            if(req.type === 'json'){
              try {
                resolve(JSON.parse(data.toString()));
              }
              catch(e){
                reject(e);
              }
            }
            else {
              resolve(data);
            }
          }
          res.on('end', () => {
            let data = Buffer.concat(chunks);
            if(res.headers['content-encoding'] === 'gzip'){
              zlib.gunzip(data, (err, unzipped) => {
                if(err) reject(err);
                else handleData(unzipped);
              });
            }
            else {
              handleData(data);
            }
          });
        });
        hreq.on('error', e => {
          reject(new Error('request error: ' + e.message));
        });
        if(payload) hreq.write(payload);
        hreq.end();
      }
    });
  }
}
