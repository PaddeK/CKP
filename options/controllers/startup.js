'use strict';
var _CKP = _CKP || {};

_CKP.Options = _CKP.Options || {};
_CKP.Options.Controller = _CKP.Options.Controller || {};

_CKP.Options.Controller.StartupController = function StartupController($scope, Settings)
{
    Settings.getCurrentDatabaseChoice().then(function (choice) {
        $scope.alreadyChoseDb = choice != null;
    }).then(function () {
        $scope.$apply();
    });
};