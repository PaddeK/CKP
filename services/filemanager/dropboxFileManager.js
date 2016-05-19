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

_CKP.FileManager = _CKP.FileManager || {};

_CKP.FileManager.DropboxFileManager = function DropboxFileManager($http, Settings) {
	var accessTokenType = 'dropbox',
		state = {loggedIn: false};

	return {
        key: 'dropbox',
        routePath: '/dropboxFile',
        listDatabases: listDatabasesSafe,
        getDatabaseChoiceData: getDatabaseChoiceData,
        getChosenDatabaseFile: getChosenDatabaseFile,
        supportedFeatures: ['ingognito', 'listDatabases'],
        title: 'Dropbox',
        icon: 'icon-dropbox',
        chooseTitle: 'Dropbox',
        chooseDescription: 'Access password files stored on Dropbox. Files will be retrieved from Dropbox each time they are used.',
        interactiveLogin: interactiveLogin,
        ensureOriginPermissions: ensureOriginPermissions,
        state: state,
        login: login,
        logout: logout
    };

    // lists databases if a token is already stored
	function listDatabasesSafe() {
		return Settings.getAccessToken(accessTokenType).then(function (storedToken) {
            return storedToken ? listDatabases() : [];
		});
	}

	function login() {
		return listDatabases();
	}

	function logout() {
		return Settings.saveAccessToken(accessTokenType, null).then(function () {
			state.loggedIn = false;
		});
	}

	function listDatabases() {
		return getToken().then(function (accessToken) {
			var req = {
				method: 'GET', 
				url: 'https://api.dropbox.com/1/search/auto/',
				params: {query: '.kdb'},
				headers: {Authorization: 'Bearer ' + accessToken}
			};

			return $http(req);
		}).then(function(response) {
			return response.data.map(function( fileInfo) {
				return {title: fileInfo.path};
			});
		}).catch(function (response) {
			if (response.status == 401) {
				// unauthorized, means the token is bad.  retry with new token.
				return interactiveLogin().then(listDatabases);
			}
		});
	}

	// get the minimum information needed to identify this file for future retrieval
	function getDatabaseChoiceData(dbInfo) {
		return {title: dbInfo.title};
	}

	// given minimal file information, retrieve the actual file
	function getChosenDatabaseFile(dbInfo) {
		return getToken().then(function (accessToken) {
			return $http({
				method: 'GET',
				url: 'https://api-content.dropbox.com/1/files/auto' + dbInfo.title,
				responseType: 'arraybuffer',
				headers: {Authorization: 'Bearer ' + accessToken}
			});
		}).then(function (response) {
			return response.data;
		}).catch(function (response) {
			if (response.status == 401) {
				// unauthorized, means the token is bad.  retry with new token.
				return interactiveLogin().then(function () {
					return getChosenDatabaseFile(dbInfo);
				});
			}
		});
	}

	function ensureOriginPermissions() {
		var dropboxOrigins = ['https://*.dropbox.com/'];

		return chrome.p.permissions.contains({origins: dropboxOrigins}).then(function () {
			return true;
		}).catch(function() {
			return chrome.p.permissions.request({origins: dropboxOrigins}).then(function () {
				return true;
			}).catch(function () {
				return false;
			});
		});
	}

	function getToken() {
		return Settings.getAccessToken(accessTokenType).then(function (storedToken) {
			if (storedToken) {
				state.loggedIn = true;
				return storedToken;
			}

			return interactiveLogin().then(function (newToken) {
				return newToken;
			});
		});
	} 

	function interactiveLogin() {
		return ensureOriginPermissions().then(function () {
			return new Promise(function (resolve, reject) {
				var randomState = Base64.encode(window.crypto.getRandomValues(new Uint8Array(16))), // random state, protects against CSRF
				    authUrl = 'https://www.dropbox.com/1/oauth2/authorize?response_type=token&client_id=6kxu9nd18t4g74m'
					        + '&state=' + encodeURIComponent(randomState)
					        + '&redirect_uri=' + encodeURIComponent(chrome.identity.getRedirectURL('dropbox'))
					        + '&force_reapprove=false';

				chrome.p.identity.launchWebAuthFlow({'url': authUrl, 'interactive': true}).then(function (redirectUrl) {
					var access_token, checkState,
                        tokenMatches = /access_token=([^&]+)/.exec(redirectUrl),
					    stateMatches = /state=([^&]+)/.exec(redirectUrl),
					    uidMatches = /uid=(\d+)/.exec(redirectUrl);

					if (tokenMatches && stateMatches && uidMatches) {
						access_token = tokenMatches[1];
						checkState = decodeURIComponent(decodeURIComponent(stateMatches[1])); // I have no idea why it is double-encoded

						if (checkState === randomState) {
							state.loggedIn = true;
							Settings.saveAccessToken(accessTokenType, access_token).then(function () {
								resolve(access_token);
							});							
						}

						// some sort of error or parsing failure
						reject();
						console.log(redirectUrl);
					}

					// some sort of error
					reject();
					console.log(redirectUrl);
				}).catch(function (err) {
					reject(err);
				});		
			});
		});
	}
};
