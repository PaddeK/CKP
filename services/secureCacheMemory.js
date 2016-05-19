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
 * Storage in background page memory.
 */
_CKP.Services.SecureCacheMemory = function SecureCacheMemory(ProtectedMemory) {
    var awaiting = [],
        notifyReady,
        readyPromise = new Promise(function(resolve) {
            notifyReady = resolve;
        });

    // init. get tabId and open a port
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        if (tabs && tabs.length) {
            notifyReady(chrome.runtime.connect({name: 'tab' + tabs[0].id}));
        }
    });

    readyPromise.then(function (port) {
        port.onMessage.addListener(function (serializedSavedState) {
            var notifier = awaiting.shift();// called from the background when we get a response, i.e. some saved state.

            notifier(ProtectedMemory.hydrate(serializedSavedState)); //notify others
        });
    });

    return {
        ready: ready,
        get: get,
        clear: clear,
        save: save
    };

    function ready() {
        return readyPromise.then(function () {
            return true;
        });
    }

    // wake up the background page and get a pipe to send/receive messages:
    function get(key) {
        readyPromise.then(function (port) {
            port.postMessage({action: 'get', key: key});
        });

        return new Promise(function (resolve) {
            awaiting.push(resolve);
        });
    }

    function clear() {
        return readyPromise.then(function (port) {
            port.postMessage({action: 'clear'});
        });
    }

    function save(key, value) {
        return readyPromise.then(function (port) {
            port.postMessage({action: 'save', key: key, value: ProtectedMemory.serialize(value)});
        });
    }
};
