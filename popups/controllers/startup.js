'use strict';
var _CKP = _CKP || {};

_CKP.Popup = _CKP.Popup || {};
_CKP.Popup.Controller = _CKP.Popup.Controller || {};

_CKP.Popup.Controller.StartupController = function StartupController(
    $scope, $location, Settings, OptionsLink, FileSourceRegistry)
{
    $scope.ready = false;

    Settings.getCurrentDatabaseChoice().then(function (info) {
        var readyPromises = [];

        // use the last chosen database
        if (info) {
            $location.path('/masterPassword/' + info.providerKey + '/' + encodeURIComponent(info.passwordFile.title));
        } else {
            // user has not yet chosen a database.  Lets see if there are any available to choose...
            FileSourceRegistry.listFileManagers('listDatabases').forEach(function (provider) {
                readyPromises.push(provider.listDatabases());
            });

            return Promise.all(readyPromises).then(function (filesArrays) {
                var availableFiles = filesArrays.reduce(function (prev, curr) {
                    return prev.concat(curr);
                });

                if (availableFiles.length) {
                    // choose one of the files
                    $location.path('/chooseFile');
                } else {
                    // no files available - allow the user to link to the options page
                    $scope.ready = true;
                }
            });
        }
    }).then(function () {
        $scope.$apply();
    });

    $scope.openOptionsPage = function () {
        OptionsLink.go();
    };
};
