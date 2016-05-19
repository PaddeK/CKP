'use strict';
var _CKP = _CKP || {};

_CKP.Popup = _CKP.Popup || {};
_CKP.Popup.Controller = _CKP.Popup.Controller || {};
_CKP.Popup.Routes = _CKP.Popup.Routes || {};
_CKP.Popup.Routes.MasterPasswordController = '/masterPassword/:providerKey/:fileTitle';

_CKP.Popup.Controller.MasterPasswordController = function MasterPasswordController(
    $scope, $routeParams, $location, KeepassDb, UnlockedState, SecureCacheDisk, Settings, OptionsLink)
{
    var passwordKey;

    $scope.masterPassword = '';
    $scope.busy = false;
    $scope.fileName = decodeURIComponent($routeParams.fileTitle);
    $scope.providerKey = $routeParams.providerKey;
    $scope.selectedKeyFile = null;
    $scope.unlockedState = UnlockedState;
    $scope.os = {};

    chrome.runtime.getPlatformInfo(function (info) {
        $scope.$apply(function () {
            $scope.os[info.os] = true;
        });
    });

    $scope.setRememberPeriod = function (periodInMinutes) {
  	    $scope.rememberPeriod = periodInMinutes;
    };

    Settings.getKeyFiles().then(function (keyFiles) {
        $scope.keyFiles = keyFiles;
    }).then(function () {
        return Settings.getDefaultRememberOptions();
    }).then(function (rememberOptions) {
        $scope.rememberPassword = rememberOptions.rememberPassword;

        if (rememberOptions.rememberPassword) {
            $scope.rememberPeriod = rememberOptions.rememberPeriod;
        }
    }).then(function () {
        return Settings.getCurrentDatabaseUsage();
    }).then(function (usage) {
        var matches;
        // tweak UI based on what we know about the database file
        $scope.hidePassword = (usage.requiresPassword === false);
        $scope.hideKeyFile = (usage.requiresKeyfile === false);
        passwordKey = usage.passwordKey ? Base64.decode(usage.passwordKey): undefined;
        $scope.rememberedPassword = !!passwordKey;

        if ($scope.rememberedPassword) {
            $scope.rememberPassword = true;
            $scope.rememberPeriod = usage.rememberPeriod;
        }

        if ($scope.rememberedPassword) {
            // remembered password - autologin
            $scope.enterMasterPassword()
        } else if (usage.keyFileName) {
            // get matched key file
            matches = $scope.keyFiles.filter(function (keyFile) {
                return keyFile.name == usage.keyFileName;
            });

            if (matches.length) {
                $scope.selectedKeyFile = matches[0];

                if ($scope.hidePassword) {
                    // auto-login
                    $scope.enterMasterPassword();
                }
            }
        }
    }).then(function () {
        $scope.$apply();
    });

    // determine current tab info:
    UnlockedState.getTabDetails().then(function () {
        $scope.$apply();
    });

    // get entries from secure cache
    SecureCacheDisk.get('entries').then(function (entries) {
        if (entries && entries.length) {
            return SecureCacheDisk.get('streamKey').then(function (streamKey) {
                showResults(entries, streamKey);
                $scope.$apply();
            });
        }
    }).catch(function () {
        // this is fine - it just means the cache expired.  Clear the cache to be sure.
        SecureCacheDisk.clear('entries');
        SecureCacheDisk.clear('streamKey');
    });

    $scope.forgetPassword = function () {
        Settings.saveCurrentDatabaseUsage({

        }).then(function() {
            SecureCacheDisk.clear('entries');
            SecureCacheDisk.clear('streamKey');
            UnlockedState.clearBackgroundState();
            window.close();
        });
    };

  // go to the options page to manage key files
    $scope.manageKeyFiles = function () {
        OptionsLink.go();
    };

    $scope.chooseAnotherFile = function () {
        UnlockedState.clearBackgroundState();
        SecureCacheDisk.clear('entries');
        SecureCacheDisk.clear('streamKey');
        $location.path('/chooseFile');
    };

    $scope.enterMasterPassword = function () {
        var passwordKeyPromise;

        $scope.clearMessages();
        $scope.busy = true;

        if (!passwordKey) {
            passwordKeyPromise = KeepassDb.getMasterKey($scope.masterPassword, $scope.selectedKeyFile);
        } else {
            passwordKeyPromise = Promise.resolve(passwordKey);
        }

        passwordKeyPromise.then(function (newPasswordKey) {
            passwordKey = newPasswordKey;
            return KeepassDb.getPasswords(passwordKey);
        }).then(function (entries) {
            // remember usage for next time:
            Settings.saveCurrentDatabaseUsage({
                requiresPassword: $scope.masterPassword ? true : false,
                requiresKeyfile: $scope.selectedKeyFile ? true : false,
                passwordKey: $scope.rememberPassword ? Base64.encode(passwordKey) : undefined,
                keyFileName: $scope.selectedKeyFile ? $scope.selectedKeyFile.name : '',
                rememberPeriod: $scope.rememberPeriod
            });

            Settings.saveDefaultRememberOptions($scope.rememberPassword, $scope.rememberPeriod);

            if ($scope.rememberPeriod) {
                Settings.setForgetTime('forgetPassword', (Date.now() + (60000 * $scope.rememberPeriod)));
            } else {
                // don't clear passwords
                Settings.clearForgetTimes(['forgetPassword']);
            }

            // show results:
            showResults(entries, KeepassDb.getStreamKey());

            $scope.busy = false;
        }).catch(function (err) {
            $scope.errorMessage = err.message || 'Incorrect password or key file';
            $scope.busy = false;
            passwordKey = null;
        }).then(function () {
            $scope.$apply();
        });
    };

    function showResults(entries, streamKey) {
        var siteUrl = parseUrl(UnlockedState.getUrl());
        var siteTokens = getValidTokens(siteUrl.hostname + "." + UnlockedState.getTitle());

        entries.forEach(function(entry) {
            var i, j,
                entryHostName = parseUrl(entry.url).hostname || '',// apply a ranking algorithm to find the best matches
                entryTokens = getValidTokens(entryHostName + '.' + entry.title),
                unlockTitle = UnlockedState.getTitle(),
                titleLower = entry.title.toLowerCase(),
                urlLower = entry.url.toLowerCase();

            entry.matchRank  = entryHostName && entryHostName == siteUrl.hostname ? 100 : 0;
            entry.matchRank += (entry.title && unlockTitle && titleLower == unlockTitle.toLowerCase()) ? 1 : 0;
            entry.matchRank += (entry.title && titleLower === siteUrl.hostname.toLowerCase()) ? 1 : 0;
            entry.matchRank += (entry.url && siteUrl.hostname.indexOf(urlLower) > -1) ? 0.9 : 0;
            entry.matchRank += (entry.title && siteUrl.hostname.indexOf(titleLower) > -1) ? 0.9 : 0;

            for (i = 0; i < entryTokens.length; i++) {
                for (j = 0; j < siteTokens.length; j++) {
                    entry.matchRank += (entryTokens[i] === siteTokens[j]) ? 0.2 : 0;
                }
            }
        });

        // save short term (in-memory) filtered results
        UnlockedState.setEntries(entries.filter(function (entry) {
            return (entry.matchRank >= 100)
        }));

        if (UnlockedState.getEntries().length == 0) {
            UnlockedState.setEntries(entries.filter(function (entry) {
                return (entry.matchRank > 0.8 && !entry.URL); // a good match for an entry without a url
            }));
        }

        if (UnlockedState.getEntries().length == 0) {
            UnlockedState.setEntries(entries.filter(function (entry) {
                return (entry.matchRank >= 0.4);
            }));

            if (UnlockedState.getEntries().length) {
                $scope.partialMatchMessage = 'No close matches, showing ' + UnlockedState.getEntries().length
                                           + ' partial matches.';
            }
        }

        if (UnlockedState.getEntries().length == 0) {
            $scope.errorMessage = 'No matches found for this site.';
        }

        UnlockedState.setStreamKey(streamKey);

        // save longer term (in encrypted storage)
        SecureCacheDisk.save('entries', entries);
        SecureCacheDisk.save('streamKey', streamKey);
    }

    $scope.findManually = function () {
        $location.path('/findEntry');
    };

    $scope.clearMessages = function () {
        $scope.errorMessage = '';
        $scope.successMessage = '';
        $scope.partialMatchMessage = '';
    };

    function getValidTokens(tokenString) {
        if (!tokenString) {
            return [];
        }

        return tokenString.toLowerCase().split(/\.|\s|\//).filter(function (token) {
            return (token && token !== 'com' && token !== 'www' && token.length > 1);
        });
    }

    function parseUrl(url) {
        var parser;

        if(url && !url.indexOf('http') == 0) {
            url = 'http://' + url;
        }

        // from https://gist.github.com/jlong/2428561
        parser = document.createElement('a');
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