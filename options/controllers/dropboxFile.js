'use strict';
var _CKP = _CKP || {};

_CKP.Options = _CKP.Options || {};
_CKP.Options.Controller = _CKP.Options.Controller || {};

_CKP.Options.Controller.DropboxFileController = function DropboxFileController($scope, DropboxFileManager)
{
    $scope.state = DropboxFileManager.state;

    $scope.listFiles = function () {
        $scope.busy = true;

        DropboxFileManager.listDatabases().then(function (files) {
            $scope.$apply(function () {
                $scope.files = files;
                $scope.busy = false;
            });
        }).catch(function () {
            $scope.$apply(function () {
                $scope.busy = false;
            });
        });
    };

    $scope.login = function() {
        DropboxFileManager.login().then(function () {
            $scope.listFiles();
        })
    };

    $scope.logout = function() {
        DropboxFileManager.logout().then(function () {
            $scope.listFiles();
        });
    };

    $scope.selectFile = function (file) {};

    $scope.listFiles();
};