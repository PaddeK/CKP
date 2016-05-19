'use strict';
var _CKP = _CKP || {};

_CKP.Options = _CKP.Options || {};
_CKP.Options.Controller = _CKP.Options.Controller || {};

_CKP.Options.Controller.OneDriveFileController = function OneDriveFileController($scope, OneDriveFileManager)
{
    $scope.busy = false;
    $scope.authorized = false;

    OneDriveFileManager.isAuthorized().then(function (authorized) {
        $scope.authorized = authorized;

        if (authorized) {
            listDatabases();
        }
    });

    $scope.authorize = function () {
        $scope.busy = true;

        OneDriveFileManager.authorize().then(function () {
            $scope.authorized = true;
            return listDatabases();
        }).finally(function () {
            $scope.busy = false;
        });
    };

    $scope.deauthorize = function () {
        $scope.busy = true;
        $scope.authorized = false;
        $scope.files = [];

        OneDriveFileManager.revokeAuth().finally(function () {
            $scope.busy = false;
        });
    };

    function listDatabases() {
        $scope.busy = true;

        return OneDriveFileManager.listDatabases().then(function (files) {
            $scope.files = files;
        }).finally(function () {
            $scope.busy = false;
        });
    }
};