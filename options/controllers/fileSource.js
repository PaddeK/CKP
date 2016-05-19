'use strict';
var _CKP = _CKP || {};

_CKP.Options = _CKP.Options || {};
_CKP.Options.Controller = _CKP.Options.Controller || {};

_CKP.Options.Controller.FileSourceController = function FileSourceController($scope, $location, FileSourceRegistry)
{
    $scope.fileManagers = FileSourceRegistry.listFileManagers();

    $scope.choose = function (fm) {
        $location.path(fm.routePath);
    };

    $scope.setDescription = function (fm) {
        $scope.description = fm.chooseDescription;
    };

    $scope.clearDescription = function () {
        $scope.description = '';
    };
};