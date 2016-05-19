'use strict';
var _CKP = _CKP || {};

_CKP.Options = _CKP.Options || {};
_CKP.Options.Controller = _CKP.Options.Controller || {};

_CKP.Options.Controller.GoogleDriveFileController = function GoogleDriveFileController($scope, GoogleDriveFileManager)
{
    $scope.docs = [];

    $scope.refresh = function () {
        $scope.docs = [];
        $scope.refreshing = true;
        $scope.errorMessage = '';

        GoogleDriveFileManager.interactiveRequestAuth().then(function () {
            return GoogleDriveFileManager.listDatabases();
        }).then(function (docs) {
            $scope.docs = docs;
            $scope.errorMessage = '';
        }).catch(function (err) {
            $scope.errorMessage = err.message || 'Unknown Error';
        }).then(function () {
            $scope.refreshing = false;
            $scope.$apply();
        });
    };

    //authorizes and fetches the docs
    $scope.authorize = function () {
        $scope.refreshing = true;
        $scope.errorMessage = '';
        $scope.requestingUrl = true;

        GoogleDriveFileManager.ensureGoogleUrlPermissions().then(function () {
            $scope.requestingUrl = false;
            $scope.requestingDriveAccess = true;
            $scope.$apply();
            return GoogleDriveFileManager.interactiveRequestAuth();
        }).then(function () {
            $scope.requestingDriveAccess = false;
            $scope.$apply();
            return GoogleDriveFileManager.listDatabases();
        }).then(function (docs) {
            $scope.docs = docs;
        }).catch(function (err) {
            $scope.errorMessage = err.message || 'Error authorizing';
        }).then(function () {
            $scope.requestingUrl = false;
            $scope.requestingDriveAccess = false;
            $scope.refreshing = false;
            $scope.$apply();
        });
    };

    $scope.logout = function () {
        $scope.errorMessage = '';

        GoogleDriveFileManager.revokeAuth().then(function () {
            $scope.$apply();
        });
    };

    //returns true if user is authenticated to google docs
    $scope.authorized = function () {
        return GoogleDriveFileManager.isAuthorized();
    };

    //init:
    $scope.refreshing = true;
    GoogleDriveFileManager.listDatabases().then(function (docs) {
        $scope.docs = docs;
    }).catch(function (err) {
        $scope.errorMessage = ''; //clear the message because we don't want to show errors on startup
    }).then(function () {
        $scope.refreshing = false;
        $scope.$apply();
    });
};