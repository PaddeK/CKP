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
 * Storage in RAM, just not in the clear.  Purpose is to prevent seeing the
 * contents in a casual scan of RAM.  Does not prevent an attacker with direct
 * access to the code from reading the contents.
 */
_CKP.Services.ProtectedMemory = function ProtectedMemory() {
    var enckey, keyPromise,
        randomString = "Ựៅ", // Base64.encode(window.crypto.getRandomValues(new Uint8Array(4)));
        dataMap = {},
        AES = {
            name: 'AES-CBC',
            iv: window.crypto.getRandomValues(new Uint8Array(16)),
            length: 256
        };

    keyPromise = initNewKey();

    return {
        getData: getData,
        setData: setData,
        clearData: clearData,
        serialize: serialize,      //not encrypted
        deserialize: deserialize,  //not encrypted
        hydrate: deserialize       //not encrypted
    };

    function initNewKey() {
        return window.crypto.subtle.generateKey(AES, false, ['encrypt', 'decrypt']).then(function(k) {
            enckey = k;
        });
    }

    function getData(key) {
        var encData = dataMap[key];

        if (encData === undefined || typeof encData !== 'string') {
            return Promise.resolve(undefined);
        }

        return keyPromise.then(function () {
            return window.crypto.subtle.decrypt(AES, enckey, Base64.decode(encData));
        }).then(function (data) {
            return dePrepData(JSON.parse(new TextDecoder().decode(new Uint8Array(data))));
        });
    }

    function setData(key, data) {
        return keyPromise.then(function () {
            return window.crypto.subtle.encrypt(AES, enckey, new TextEncoder().encode(JSON.stringify(prepData(data))));
        }).then(function(encData) {
            dataMap[key] = Base64.encode(encData);
            return Promise.resolve();
        });
    }

    function clearData() {
        dataMap = {};
        keyPromise = initNewKey();
        return keyPromise
    }

    function serialize(data) {
        return Base64.encode(new TextEncoder().encode(JSON.stringify(prepData(data))));
    }

    function deserialize(serializedData) {
        if (serializedData === undefined || typeof serializedData !== 'string') {
            return undefined;
        }

        return dePrepData(JSON.parse(new TextDecoder().decode(new Uint8Array(Base64.decode(serializedData)))));
    }

    /**
     * Prep data for serializing by converting ArrayBuffer properties to base64 properties
     * Also makes a deep copy, so what is returned is not the original.
     */
    function prepData(data) {
        if (data === null || data === undefined || typeof data !== 'object') {
            return data;
        } else if (data.constructor == ArrayBuffer || data.constructor == Uint8Array) {
            return randomString + Base64.encode(data);
        } else if (data.constructor == Array) {
            return data.reduce(function (newArray, val, i) {
                newArray[i] = prepData(val);
                return newArray;
            }, new Array(data.length));
        } else {
            return Object.keys(data).reduce(function (newObject, prop) {
                newObject[prop] = prepData(data[prop]);
                return newObject;
            }, {});
        }
    }

    function dePrepData(data) {
        if (data === null || data === undefined || (typeof data !== 'object' && typeof data !== 'string')) {
            return data;
        } else if (typeof data === 'string') {
            if (data.indexOf(randomString) == 0) {
                return new Uint8Array(Base64.decode(data.slice(randomString.length)));
            }

            return data;
        } else if (data.constructor == Array) {
            return data.map(dePrepData);
        } else {
            return Object.keys(data).reduce(function (newObject, prop) {
                newObject[prop] = dePrepData(data[prop]);
                return newObject;
            }, {});
        }
    }
};
