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
 * Settings for CKP
 */
_CKP.Services.Settings = function Settings() {
	var saveDatabaseUsages = genericSetter.bind(null, 'databaseUsages', true),
        getKeyFiles = genericGetter.bind(null, 'keyFiles', []),
        getDatabaseUsages = genericGetter.bind(null, 'databaseUsages', {}),
        getCurrentDatabaseChoice = genericGetter.bind(null, 'selectedDatabase', null);

	return {
        upgrade: upgrade,
        getKeyFiles: getKeyFiles,
        deleteKeyFile: deleteKeyFile,
        addKeyFile: addKeyFile,
        setDiskCacheFlag: genericSetter.bind(null, 'useDiskCache', true),
        getDiskCacheFlag: genericGetter.bind(null, 'useDiskCache'),
        saveDatabaseUsages: saveDatabaseUsages,
        getDatabaseUsages: getDatabaseUsages,
        saveCurrentDatabaseChoice: saveCurrentDatabaseChoice,
        getCurrentDatabaseChoice: getCurrentDatabaseChoice,
        saveDefaultRememberOptions: genericSetter.bind(null, 'rememberPeriod'),
        getDefaultRememberOptions: getDefaultRememberOptions,
        saveLicense: genericSetter.bind(null, 'license', true),
        getLicense: genericGetter.bind(null, 'license', null),
        saveAccessToken: saveAccessToken,
        getAccessToken: getAccessToken,
        setForgetTime: handleForgetTimes,
        getForgetTime: handleForgetTimes.bind(null, undefined),
        getAllForgetTimes: handleForgetTimes.bind(null, undefined, undefined),
        clearForgetTimes: handleForgetTimes.bind(null, undefined),
        saveCurrentDatabaseUsage: saveCurrentDatabaseUsage,
        getCurrentDatabaseUsage: getCurrentDatabaseUsage,
        setUseCredentialApiFlag: genericSetter.bind(null, 'useCredentialApi'),
        getUseCredentialApiFlag: genericGetter.bind(null, 'useCredentialApi', false)
    };

	// upgrade old settings. Called on install.
	function upgrade() {
        // move key files out of usages into key file section
		getDatabaseUsages().then(function (usages) {
            var usageKey, usage;

			for (usageKey in usages) {
                if (usages.hasOwnProperty(usageKey)) {
                    usage = usages[usageKey];

                    if (usage.keyFileName && usage.fileKeyBase64) {
                        addKeyFile(usage.keyFileName, Base64.decode(usage.fileKeyBase64));
                    }

                    usage.fileKeyBase64 = undefined;
                    usage.forgetKeyFile = undefined;
                }
			}

			saveDatabaseUsages(usages);
		});

		// change the way we store currently selected database
		chrome.p.storage.local.get(['passwordFile', 'providerKey']).then(function (items) {
			if (items.passwordFile && items.providerKey) {
                chrome.p.storage.local.set({
                    'selectedDatabase': {
                        'providerKey': items.providerKey,
						'passwordFile': items.passwordFile
					}
				}).then(function () {
					chrome.p.storage.local.remove(['passwordFile', 'providerKey']);
				});
			}
		});
	}

    function genericSetter(key, flag, value) {
        var obj = {};

        if (flag) {
            obj[key] = value === undefined ? true : value;
            return chrome.p.storage.local.set(obj);
        }

        return chrome.p.storage.local.remove(key);
    }

    function genericGetter(key, defaultValue) {
        return chrome.p.storage.local.get(key).then(function (items) {
            return defaultValue === undefined ? items[key] : items[key] || defaultValue;
        });
    }

	function deleteKeyFile(name) {
        return getKeyFiles().then(function (keyFiles) {
            keyFiles.forEach(function (keyFile, index) {
                if (keyFile.name == name) {
                    keyFiles.splice(index, 1);
				}
			});

            return chrome.p.storage.local.set({keyFiles: keyFiles});
		});
	}

	function addKeyFile(name, key) {
		return getKeyFiles().then(function (keyFiles) {
			var encodedKey = Base64.encode(key),
                matches = keyFiles.filter(function (keyFile) {
				    return keyFile.name == name;
			    });

			if (matches.length) {
				// update
				matches[0].encodedKey = encodedKey;
			} else {
				// insert
				keyFiles.push({name: name, encodedKey: encodedKey});
			}

			return chrome.p.storage.local.set({keyFiles: keyFiles});
		});
	}

	function saveCurrentDatabaseChoice(passwordFile, provider) {
		passwordFile = angular.copy(passwordFile);
		passwordFile.data = undefined; //don't save the data with the choice

		return chrome.p.storage.local.set({
			'selectedDatabase': {
				'passwordFile': passwordFile,
				'providerKey': provider.key
			}
		});
	}

	function getDefaultRememberOptions() {
		return chrome.p.storage.local.get('rememberPeriod').then(function (items) {
            var obj = {rememberPassword: !!items.rememberPeriod};

            if (obj.rememberPassword) {
                obj.rememberPeriod = items.rememberPeriod;
            }

            return obj;
		});
	}

	function saveAccessToken(type, accessToken) {
		var entries = {};

        entries[type + 'AccessToken'] = accessToken;

		return chrome.p.storage.local.set(entries);
	}

	function getAccessToken(type) {
		var key = type + 'AccessToken';

        return chrome.p.storage.local.get(key).then(function (items) {
            return items[key] || null;
		});
	}

    function handleForgetTimes(key, time) {
		return chrome.p.storage.local.get('forgetTimes').then(function (items) {
			var forgetTimes = {};

			if (items.forgetTimes) {
				forgetTimes = items.forgetTimes;
			}

            if (key !== undefined && time !== undefined) {
                forgetTimes[key] = time;
                return chrome.p.storage.local.set({forgetTimes: forgetTimes});
            } else if (time !== undefined) {
                if (time.constructor !== Array) {
                    return forgetTimes[time]; // time = key
                }

                // time = array of keys to delete
                time.forEach(function (k) {
                    delete forgetTimes[k];
                });

                return chrome.p.storage.local.set({forgetTimes: forgetTimes});
            }

            return forgetTimes;
		});
    }

    /**
     * Saves information about how the database was opened, so we can optimize the
     * UI next time by hiding the irrelevant options and remembering the keyfile
     */
    function saveCurrentDatabaseUsage(usage) {
        return getCurrentDatabaseChoice().then(function (info) {
            return getDatabaseUsages().then(function (usages) {
                usages[info.passwordFile.title + "__" + info.providerKey] = usage;

                return saveDatabaseUsages(usages);
            });
        });
    }

    /**
     * Retrieves information about how the database was opened, so we can optimize the
     * UI by hiding the irrelevant options and remembering the keyfile
     */
    function getCurrentDatabaseUsage() {
        return getCurrentDatabaseChoice().then(function (info) {
            return getDatabaseUsages().then(function (usages) {
                return usages[info.passwordFile.title + "__" + info.providerKey] || {};
            });
        });
    }
};
