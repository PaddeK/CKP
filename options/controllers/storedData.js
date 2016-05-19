'use strict';
var _CKP = _CKP || {};

_CKP.Options = _CKP.Options || {};
_CKP.Options.Controller = _CKP.Options.Controller || {};

_CKP.Options.Controller.StoredDataController = function StoredDataController($scope)
{
    Promise.all([refreshLocalStorage(), refreshSyncStorage(), refreshPermissions()]).then(function () {
        $scope.$apply();
    });

    function refreshLocalStorage() {
        $scope.localData = [];

        return chrome.p.storage.local.get(null).then(function (items) {
            Object.keys(items).forEach(function (key) {
                $scope.localData.push({
                    key: key,
                    data: items[key]
                });
            });
        });
    }

    function refreshSyncStorage() {
        $scope.syncData = [];

        return chrome.p.storage.sync.get(null).then(function (items) {
            Object.keys(items).forEach(function (key) {
                $scope.syncData.push({
                    key: key,
                    data: items[key]
                });
            });
        });
    }

    function refreshPermissions() {
        $scope.permissions = {};

        return chrome.p.permissions.getAll().then(function (perms) {
            $scope.permissions = perms;
        });
    }

    $scope.deleteLocalData = function (key) {
        chrome.p.storage.local.remove(key).then(function () {
            return refreshLocalStorage();
        }).then(function () {
            $scope.$apply();
        });
    };

    $scope.deleteOriginPermission = function (origin) {
        chrome.p.permissions.remove({origins: [origin]}).then(function () {
            return refreshPermissions();
        }).then(function () {
            $scope.$apply();
        });
    };
};