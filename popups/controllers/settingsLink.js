'use strict';
var _CKP = _CKP || {};

_CKP.Popup = _CKP.Popup || {};
_CKP.Popup.Controller = _CKP.Popup.Controller || {};

_CKP.Popup.Controller.SettingsLinkController = function SettingsLinkController($scope, $location, OptionsLink) {
    $scope.showSettingsPage = function () {
        OptionsLink.go();
    }
};
