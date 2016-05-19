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

/*
  This page runs as an Event page, not a Background page, so don't use global variables
  (they will be lost)
*/

(function (ProtectedMemory, Settings) {
	if (chrome.extension.inIncognitoContext) {
		doReplaceRules();
	} else {
		chrome.runtime.onInstalled.addListener(doReplaceRules);
		chrome.runtime.onInstalled.addListener(Settings.upgrade);
		chrome.runtime.onStartup.addListener(forgetStuff)
	}

	function doReplaceRules() {
		chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
			var passwordField = {
                id: "pwdField",
				conditions: [
					new chrome.declarativeContent.PageStateMatcher({
						css: ["input[type='password']"]
					})
				],
				actions: [
					new chrome.declarativeContent.ShowPageAction()
				]
			};
			var textField = {
				id: "textField",
				conditions: [
					new chrome.declarativeContent.PageStateMatcher({
						css: ["input[type='text'], input[type='email'], input:not([type])"]
					})
				],
				actions: [
					new chrome.declarativeContent.ShowPageAction()
				]
			};
			var iframeLogin = {
				id: "iframeLogin",
				conditions: [
					new chrome.declarativeContent.PageStateMatcher({
						css: ["iframe[src^='https']"]
					})
				],
				actions: [
					new chrome.declarativeContent.ShowPageAction()
				]
			};
			chrome.declarativeContent.onPageChanged.addRules([passwordField, textField, iframeLogin]);
		});
	}

	// keep saved state for the popup for as long as we are alive (not long):
	chrome.runtime.onConnect.addListener(function (port) {
		// communicate state on this pipe.  each named port gets its own state.
		port.onMessage.addListener(function (msg) {
			if (!msg) {
                return;
            }
			switch (msg.action) {
				case 'clear':
					ProtectedMemory.clearData();
					break;
				case 'save':
					ProtectedMemory.setData(msg.key, msg.value);
					break;
				case 'get':
					ProtectedMemory.getData(msg.key).then(function (value) {
						port.postMessage(value);
					});
					break;
				default:
					throw new Error('unrecognized action ' + obj.action);
					break;
			}
		});

		port.onDisconnect.addListener(function () {
            // uncomment below to forget the state when the popup closes
			// protectedMemory.clearData();
		})
	});

	function handleMessage(message, sender, sendResponse) {
		if (!message || !message.m) {
            return; // message format unrecognized
        }

		if (message.m == 'requestPermission') {
			// better to do the request here on the background, because on some platforms
			// the popup may close prematurely when requesting access
			chrome.permissions.contains(message.perms, function (alreadyGranted) {
				if (chrome.runtime.lastError || (alreadyGranted && message.then)) {
					handleMessage(message.then, sender, sendResponse);
				} else {
					// request
					chrome.permissions.request(message.perms, function(granted) {
						if (granted && message.then) {
                            handleMessage(message.then, sender, sendResponse);
						}
					});
				}
			});
		}

		if (message.m == 'autofill') {
			alreadyInjected(message.tabId).then(function (injectedAlready) {
				if (injectedAlready === true) {
                    return sendFillPassword(message);
				}

				chrome.tabs.executeScript(message.tabId, {
					file: 'keepass.js',
					allFrames: true,
					runAt: 'document_start'
				}, sendFillPassword.bind(null, message));
			});
		}
	}

    function sendFillPassword(message) {
        chrome.tabs.sendMessage(message.tabId, {
            m: 'fillPassword',
            u: message.u,
            p: message.p,
            o: message.o,
            uca: message.uca
        });
    }

	// function to determine if the content script is already injected, so we don't do it twice
	function alreadyInjected(tabId) {
		return new Promise(function (resolve, reject) {
			chrome.tabs.sendMessage(tabId, {m: 'ping'}, function (response) {
                resolve(!!response);
			});
		});
	}

	// listen for "autofill" message:
	chrome.runtime.onMessage.addListener(handleMessage);

	chrome.alarms.create('forgetStuff', {delayInMinutes: 1, periodInMinutes: 10});

	chrome.alarms.onAlarm.addListener(function (alarm) {
		var notificationClear = alarm.name.match(/^clearNotification-(.*)$/);

		if (alarm.name == 'forgetStuff') {
			return forgetStuff();
		}

		if (notificationClear.length == 2) {
			chrome.notifications.clear(notificationClear[1]);
		}
	});

	function forgetStuff() {
		Settings.getAllForgetTimes().then(function (allTimes) {
			var now = Date.now(),
                notificationConfig = {
                    type: 'basic',
                    iconUrl: 'assets/icons/logo_48.png',
                    title: 'CKP'
                },
			    forgottenKeys = [];

            Object.keys(allTimes).forEach(function (key) {
				if (allTimes[key] < now) {
					forgottenKeys.push(key);

					switch (key) {
						case 'clearClipboard':
							clearClipboard();
                            notificationConfig.message = 'Clipboard cleared';
							chrome.notifications.create(notificationConfig, function (notificationId) {
								setTimeout(function () {
									chrome.notifications.clear(notificationId);
								}, 2000);
							});
							break;
						case 'forgetPassword':
							forgetPassword().then(function () {
                                notificationConfig.message = 'Remembered password expired';
								chrome.notifications.create(notificationConfig, function (notificationId) {
									chrome.alarms.create('clearNotification-'+notificationId, {delayInMinutes: 1});
								});
							});
							break;
					}
				}
            });

			// remove stuff
			Settings.clearForgetTimes(forgottenKeys);
		});
	}

	function clearClipboard() {
		var clearClipboard = function (e) {
			e.clipboardData.setData('text/plain', '');
			e.preventDefault();
			document.removeEventListener('copy', clearClipboard); // don't listen anymore
		};

		document.addEventListener('copy', clearClipboard);
		document.execCommand('copy');
	}

	function forgetPassword() {
		return Settings.saveCurrentDatabaseUsage({});
	}

})(new _CKP.Services.ProtectedMemory(), new _CKP.Services.Settings());
