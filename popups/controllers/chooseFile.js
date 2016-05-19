'use strict';
var _CKP = _CKP || {};

_CKP.Popup = _CKP.Popup || {};
_CKP.Popup.Controller = _CKP.Popup.Controller || {};

_CKP.Popup.Controller.ChooseFileController = function ChooseFileController(
    $scope, $location, FileSourceRegistry, Settings)
{
    $scope.errorMessage = '';
    $scope.successMessage = '';
    $scope.databases = [];

    FileSourceRegistry.listFileManagers('listDatabases').forEach(function (provider) {
        provider.listDatabases().then(function (databases) {
            if (databases && databases.length) {

                databases.forEach(function (database) {
                    database.provider = provider;
                });

                $scope.databases = $scope.databases.concat(databases);
            }
        }).then(function () {
            if(!$scope.$$phase) {
                $scope.$apply(); // HACK: some providers are outside of digest
            }
        });
    });

    $scope.chooseDatabase = function (database) {
        var info = database.provider.getDatabaseChoiceData(database);

        Settings.saveCurrentDatabaseChoice(info, database.provider).then(function () {
            $location.path('/masterPassword/' + database.provider.key + '/' + encodeURIComponent(database.title));
            $scope.$apply();
        });
    }
};
