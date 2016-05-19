'use strict';
var _CKP = _CKP || {};

_CKP.Options = _CKP.Options || {};
_CKP.Options.Controller = _CKP.Options.Controller || {};

_CKP.Options.Controller.AdvancedController = function AdvancedController($scope, Settings, SecureCacheDisk)
{
    $scope.flags = {
        useDiskCache: false,
        useCredentialApi: false
    };

    Settings.getDiskCacheFlag().then(function (flag) {
        $scope.flags.useDiskCache = flag;
        $scope.$apply();
    });

    Settings.getUseCredentialApiFlag().then(function (flag) {
        $scope.flags.useCredentialApi = flag;
        $scope.$apply();
    });

    $scope.updateDiskCacheFlag = function () {
        Settings.setDiskCacheFlag($scope.flags.useDiskCache);

        if (!$scope.useDiskCache) {
            SecureCacheDisk.clear('entries');
            SecureCacheDisk.clear('streamKey');
        }
    };

    $scope.updateUseCredentialApiFlag = function () {
        Settings.setUseCredentialApiFlag($scope.flags.useCredentialApi);
    };

    $scope.flagEnabled = !!(navigator.credentials);
};