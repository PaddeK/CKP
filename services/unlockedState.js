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
 * Shared state and methods for an unlocked password file.
 */
_CKP.Services.UnlockedState = function UnlockedState($interval, $location, KeepassDb, ProtectedMemory, Settings) {
	var _tabId, _url, _title, _origin, _sitePermission, _entries, _streamKey, _clipboardStatus,
		timerInstance, copyEntry;

	_tabId = '';             // tab id of current tab
	_url = '';               // url of current tab
	_title = '';             // window title of current tab
	_origin = '';            // url of current tab without path or querystring
	_sitePermission = false; // true if the extension already has rights to autofill the password
	_entries = null; 	     // filtered password database entries
	_streamKey = null; 	     // key for accessing protected data fields
	_clipboardStatus = '';   // status message about clipboard, used when copying password to the clipboard

	$interval(clearBackgroundState, 60000, 1);  // clear backgroundstate after 10 minutes live - we should never be alive that long

	// listens for the copy event and does the copy
	document.addEventListener('copy', function (e) {
		var textToPutOnClipboard,
			seconds = 60;

		if (!copyEntry) {
			return; // listener can get registered multiple times
		}

		textToPutOnClipboard = getPassword(copyEntry);
		copyEntry = null;
		e.clipboardData.setData('text/plain', textToPutOnClipboard);
		e.preventDefault();

		Settings.setForgetTime('clearClipboard', Date.now() + 60000);

		chrome.alarms.clear('forgetStuff', function () {
			// reset alarm timer so that it fires about 1 minute from now
			chrome.alarms.create('forgetStuff', {
				delayInMinutes: 1,
				periodInMinutes: 10
			});
		});

		// actual clipboard clearing occurs on the background task via alarm, this is just for user feedback:
		_clipboardStatus = 'Copied to clipboard. Clipboard will clear in 60 seconds.';

		if (timerInstance) {
			// cancel previous timer
			$interval.cancel(timerInstance);
		}

		// do timer to show countdown
		timerInstance = $interval(function () {
			seconds--;

			if (seconds <= 0) {
				_clipboardStatus = 'Clipboard cleared';
				$interval.cancel(timerInstance);
			} else {
				_clipboardStatus = 'Copied to clipboard. Clipboard will clear in ' + seconds + ' seconds.';
			}
		}, 1000);
	});

	return {
		getTabId: function () { return _tabId; },
		getUrl: function () { return _url; },
		getTitle: function () { return _title; },
		getOrigin: function () { return _origin; },
		getSitePermission: function () { return _sitePermission; },
		getEntries: function () { return _entries; },
        setEntries: function(entries) { _entries = entries; },
		setStreamKey: function (streamKey) { _streamKey = streamKey; },
		getClipboardStatus: function () { return _clipboardStatus; },
		getTabDetails: getTabDetails,
		clearBackgroundState: clearBackgroundState,
		autofill: autofill,
		copyPassword: copyPassword,
		gotoDetails: gotoDetails,
		getDecryptedAttribute: getDecryptedAttribute
	};

	// determine current url:
	function getTabDetails() {
		return new Promise(function (resolve, reject) {
			chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
				var parsedUrl, url;

				if (tabs && tabs.length) {
					_tabId = tabs[0].id;
					url = tabs[0].url.split('?');
					_url = url[0];
					_title = tabs[0].title;
					parsedUrl = parseUrl(tabs[0].url);
					_origin = parsedUrl.protocol + '//' + parsedUrl.hostname + '/';

					chrome.p.permissions.contains({origins: [_origin]}).then(function () {
						_sitePermission = true;
					}).catch(function () {
						_sitePermission = false;
					}).then(function () {
						resolve();
					});
				} else {
					reject(new Error('Unable to determine tab details'));
				}
			});
		});
	}

	function clearBackgroundState() {
		_entries = null;
		_streamKey = null;
		_clipboardStatus = '';
	}

	function autofill(entry) {
		Settings.getUseCredentialApiFlag().then(function (useCredentialApi) {
			chrome.runtime.sendMessage({
				m: 'requestPermission',
				perms: {
					origins: [_origin]
				},
				then: {
					m: 'autofill',
					tabId: _tabId,
					u: entry.userName,
					p: getPassword(entry),
					o: _origin,
					uca: useCredentialApi
				}
			});

			window.close(); //close the popup
		})
	}

	// get clear-text password from entry
	function getPassword(entry) {
		if (entry.protectedData && entry.protectedData.password)
			return KeepassDb.getDecryptedEntry(entry.protectedData.password, _streamKey);
		else {
			// KyPass support - it does not use protectedData for passwords that it adds
			return entry.password;
		}
	}

	function copyPassword(entry) {
		copyEntry = entry;
		entry.copied = true;
		document.execCommand('copy');
	}

	function gotoDetails(entry) {
		$location.path('/entryDetails/' + entry.id);
	}

	function getDecryptedAttribute(protectedAttr) {
		return KeepassDb.getDecryptedEntry(protectedAttr, _streamKey);
	}

	function parseUrl(url) {
        // from https://gist.github.com/jlong/2428561
		var parser = document.createElement('a');

		parser.href = url;

		/*
        parser.protocol; // => "http:"
        parser.hostname; // => "example.com"
        parser.port;     // => "3000"
        parser.pathname; // => "/pathname/"
        parser.search;   // => "?search=test"
        parser.hash;     // => "#hash"
        parser.host;     // => "example.com:3000"
        */

		return parser;
	}
};
