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

_CKP.FileManager.OneDriveFileManager = function OneDriveFileManager($http, $q, Settings) {
    var accessTokenType = 'onedrive';

    return {
        key: 'onedrive',
        routePath: '/oneDriveFile',
        listDatabases: listDatabases,
        getDatabaseChoiceData: getDatabaseChoiceData,
        getChosenDatabaseFile: getChosenDatabaseFile,
        supportedFeatures: ['listDatabases'],
        title: 'OneDrive',
        icon: 'icon-onedrive',
        chooseTitle: 'OneDrive',
        chooseDescription: 'Access password files stored on OneDrive. Files will be retrieved from OneDrive each time they are used.',
        authorize: authorize,
        revokeAuth: revokeAuth,
        isAuthorized: isAuthorized
    };

    function isAuthorized() {
        return Settings.getAccessToken(accessTokenType).then(function (token) {
            return token != null;
        });
    }

    function authorize() {
        var promise,
            url = 'https://login.live.com/oauth20_authorize.srf'
                + '?client_id=000000004817355D'
                + '&scope=' + encodeURIComponent('onedrive.readonly')
                + '&response_type=token'
                + '&redirect_uri=' + encodeURIComponent(chrome.identity.getRedirectURL('onedrive'));

        promise = chrome.p.identity.launchWebAuthFlow({url: url, interactive: true}).then(function (redirectUrl) {
            var authInfo = parseAuthInfoFromUrl(redirectUrl);

            if (authInfo === null) {
                return Promise.reject('Failed to extract authentication information from redirect url');
            }

            Settings.saveAccessToken(accessTokenType, authInfo.access_token);
            return Promise.resolve();
        });

        return $q.when(promise);
    }

    function listDatabases() {
        return $q.when(getToken().then(searchFiles).then(filterFiles).catch(function (response) {
            return response.status && response.status == 401 ? authorize().then(listDatabases) : [];
        }));
    }

    function searchFiles(token) {
        // there is no proper way of searching for file-extensions right now (?), so we search for files containing
        // kdb and filter ourselves afterwards
        var query = encodeURIComponent('kdb'),
            filter = encodeURIComponent('file ne null'),
            url = 'https://api.onedrive.com/v1.0/drive/root/view.search?q=' + query + '&filter=' + filter;

        return $http({method: 'GET', url: url, headers: {Authorization: 'Bearer ' + token}});
    }

    function filterFiles(response) {
        if (!response.data.value) {
            return Promise.reject('Unexpected response from OneDrive API');
        }

        // only return files that have a .kdb or .kdbx extension
        return response.data.value.filter(function (file) {
            return file.name && /\.kdbx?$/.exec(file.name);
        }).map(transformFile);
    }

    function parseAuthInfoFromUrl(url) {
        var hash = /#(.+)$/.exec(url);

        if (!hash) {
            return null;
        }

        return JSON.parse('{"' + hash[1].replace(/&/g, '","').replace(/=/g, '":"') + '"}', function (key, value) {
            return key === "" ? value : decodeURIComponent(value);
        });
    }

    function transformFile(file) {
        var split,
            path = '';

        if (file.parentReference) {
            // path will be e.g. "/drive/root:/Documents"
            path = file.parentReference.path;

            // extract the part after the colon, so "/Documents"
            split = /:(.+)$/.exec(path);

            if (split) {
                path = split[1];
            }

            if (!/\/$/.exec(path)) {
                // append trailing slash, if there was none
                path += '/';
            }
        }

        return {
            url: file['@content.downloadUrl'],
            title: path + file.name
        }
    }

    // get the minimum information needed to identify this file for future retrieval
    function getDatabaseChoiceData(dbInfo) {
        return {
            url: dbInfo.url,
            title: dbInfo.title
        };
    }

    // given minimal file information, retrieve the actual file
    function getChosenDatabaseFile(dbInfo) {
        return getToken().then(function (token) {
                return loadFile(dbInfo, token);
            }).then(function (response) {
                return response.data;
            }).catch(function (response) {
                // token expired
                if (response.status && response.status == 401) {
                    return authorize().then(function () {
                        return getChosenDatabaseFile(dbInfo);
                    });
                }
            });
    }

    function loadFile(dbInfo, token) {
        return $http({
            method: 'GET',
            url: dbInfo.url,
            responseType: 'arraybuffer',
            headers: {Authorization: 'Bearer ' + token}
        });
    }

    function revokeAuth() {
        Settings.saveAccessToken(accessTokenType, null);

        return $q.when(chrome.p.identity.launchWebAuthFlow({url: 'https://login.live.com/oauth20_logout.srf'}));
    }

    function getToken() {
        return Settings.getAccessToken(accessTokenType).then(function (token) {
            return token ? token : Promise.reject('No access token available. Did you authorize yet?');
        });
    }
};
