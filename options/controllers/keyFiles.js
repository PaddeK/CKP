'use strict';
var _CKP = _CKP || {};

_CKP.Options = _CKP.Options || {};
_CKP.Options.Controller = _CKP.Options.Controller || {};

_CKP.Options.Controller.KeyFilesController = function KeyFilesController($scope, Settings, KeyFileParser)
{
    function loadKeyFiles() {
        Settings.getKeyFiles().then(function (files) {
            $scope.$apply(function () {
                $scope.keyFiles = files;
            });
        });
    }

    loadKeyFiles();

    $scope.removeKeyFile = function (keyFile) {
        Settings.deleteKeyFile(keyFile.name).then(function() {
            loadKeyFiles();
        });
    };

    $scope.selectFile = function () {
        document.getElementById('file').click();
    };

    $scope.handleKeyFile = function (filePromises) {
        $scope.errorMessage = '';

        if (filePromises.length != 1) {
            return;
        }

        filePromises[0].then(function (info) {
            return KeyFileParser.getKeyFromFile(info.data).then(function (key) {
                return Settings.addKeyFile(info.file.name, key);
            }).then(function () {
                loadKeyFiles();
            });
        }).catch(function (err) {
            $scope.errorMessage = err.message;
            $scope.$apply();
        });
    };
};