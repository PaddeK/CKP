'use strict';
var _CKP = _CKP || {};

_CKP.Options = _CKP.Options || {};
_CKP.Options.Controller = _CKP.Options.Controller || {};

_CKP.Options.Controller.SampleDatabaseController = function SampleDatabaseController($scope, SampleDatabaseFileManager)
{
    $scope.useSample = false;

    SampleDatabaseFileManager.getActive().then(function (isActive) {
        $scope.useSample = isActive;
        $scope.$apply();
    });

    $scope.updateSampleFlag = function () {
        SampleDatabaseFileManager.setActive($scope.useSample);
    };
};