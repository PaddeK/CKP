/**

The MIT License (MIT)

Copyright (c) 2015 Steven Campbell.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

'use strict';
var _CKP = _CKP || {};

_CKP.Services = _CKP.Services || {};

/**
 * Storage on disk using a key derived from a temporary 3rd party-provided secret.
 * If a 3rd-party secret is not available, falls back to storing in-memory (still
 * encrypted though).
 *
 * Our secret is the access token for google drive.  It is secret from other
 * extensions, and it is cached in-memory by Chrome.
 *
 * Max storage time is 40 minutes, which is the expected TTL of the secret.  You
 * can see details of the expiry time in chrome://identity-internals/
 */
_CKP.Services.SecureCacheDisk = function SecureCacheDisk(ProtectedMemory, SecureCacheMemory, Settings) {
    var AES = {
            name: 'AES-CBC',
            iv: new Uint8Array([
                0x18, 0x37, 0xC9, 0x4C, 0x1F, 0x42, 0x61, 0x73, 0x92, 0x5A, 0x1D, 0xC3, 0x44, 0x0A, 0x24, 0x40
            ])
        },
        SHA = {name: 'SHA-256'},
        PBKDF2 = {name: 'PBKDF2'},
        PURPOSE = ['encrypt', 'decrypt'],
        salt = new Uint8Array([
            0xC9, 0x04, 0xF5, 0x6B, 0xCE, 0x60, 0x66, 0x24, 0xE5, 0xAA, 0xA3, 0x60, 0xDD, 0x8E, 0xDD, 0xE8
        ]);

    return {
        save: set,
        get: get,
        clear: clear,
        ready: ready
    };

    function getTokenPromise() {
        return new Promise(function (resolve, reject) {
            Settings.getDiskCacheFlag().then(function (enabled) {
                if (!enabled) {
                    reject(new Error('Disk cache is not enabled'));
                    return;
                }

                if (chrome.extension.inIncognitoContext) {
                    reject(new Error('Secure cache cannot work in incognito mode'));
                    return;
                }

                chrome.identity.getAuthToken({interactive: false}, function (token) {
                    var bytes;

                    if (token) {
                        bytes = new TextEncoder().encode(token);

                        // try PBKDF2 if available:
                        window.crypto.subtle.importKey('raw', bytes, PBKDF2, false, ['deriveKey']).then(function (key) {
                            var keyType = {
                                    name: 'PBKDF2',
                                    salt: salt,
                                    iterations: 100000,
                                    hash: SHA
                                },
                                encryptType = {
                                    name: 'AES-CBC', length: 256
                                };

                            return window.crypto.subtle.deriveKey(keyType, key, encryptType, false, PURPOSE);
                        }).catch(function () {
                            // fallback to SHA-256 hash if PBKDF2 not supported (ChromeOS, why???)
                            return window.crypto.subtle.digest(SHA, bytes).then(function (hash) {
                                return window.crypto.subtle.importKey('raw', hash, AES, false, PURPOSE);
                            });
                        }).then(function (aesKey) {
                            resolve(aesKey);
                        });
                    } else {
                        reject(new Error('Failed to get a 3rd party secret, cache not possible.'));
                    }
                });
            });
        });
    }

    function ready() {
        return getTokenPromise().then(function () {
            return true;
        }).catch(function () {
            // can still use memory
            return SecureCacheMemory.ready().then(function (val) {
                return val;
            }).catch(function (err) {
                return false;
            });
        });
    }

    function set(key, data) {
        var preppedData = ProtectedMemory.serialize(data);

        key = 'secureCache.' + key;

        return new Promise(function (resolve, reject) {
            getTokenPromise().then(function (aesKey) {
                return window.crypto.subtle.encrypt(AES, aesKey, new TextEncoder().encode(preppedData));
            }).then(function (encData) {
                var obj = {};

                preppedData = ProtectedMemory.serialize(encData);
                obj[key] = preppedData;

                chrome.storage.local.set(obj, function () {
                    // data saved
                    resolve();
                });
            }).catch(function () {
                // fallback to in-memory
                SecureCacheMemory.save(key, data).then(function () {
                    resolve();
                }).catch(function (err) {
                    reject(err);
                });
            });
        });
    }

    function get(key) {
        key = 'secureCache.' + key;

        return new Promise(function (resolve, reject) {
            chrome.storage.local.get(key, function(encSerializedData) {
                getTokenPromise().then(function (aesKey) {
                    var encData = ProtectedMemory.hydrate(encSerializedData[key]);

                    return window.crypto.subtle.decrypt(AES, aesKey, encData).then(function (decryptedBytes) {
                        resolve(ProtectedMemory.hydrate(new TextDecoder().decode(new Uint8Array(decryptedBytes))));
                    });
                }).catch(function () {
                    // fallback to in-memory
                    SecureCacheMemory.get(key).then(function (data) {
                        resolve(data);
                    }).catch(function (err) {
                        reject(err);
                    })
                });
            });
        });
    }

    function clear(key) {
        chrome.storage.local.remove('secureCache.' + key);
        SecureCacheMemory.clear();
    }
};
