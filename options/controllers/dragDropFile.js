'use strict';
var _CKP = _CKP || {};

_CKP.Options = _CKP.Options || {};
_CKP.Options.Controller = _CKP.Options.Controller || {};

_CKP.Options.Controller.DragDropFileController = function DragDropFileController($scope, LocalFileManager)
{
    $scope.files = [];
    $scope.acknowledgedLimitations = false;

    $scope.selectFile = function () {
        document.getElementById('file').click();
    };

    $scope.acknowledgeLimitations = function () {
      	$scope.acknowledgedLimitations = true;
    };

    $scope.handleDrop = function (filePromises) {
        $scope.errorMessage = '';
        $scope.loadedFiles = 0;

        filePromises.forEach(function (filePromise) {
            filePromise.then(function (info) {
                var fi,
                    existingIndex = null;

                if (info.file.name.indexOf('.kdb') < 0 || info.file.size < 70) {
                    $scope.errorMessage += info.file.name + ' is not a valid KeePass file. ';
                    return;
                }

                fi = {
                    title: info.file.name,
                    lastModified: info.file.lastModified,
                    lastModifiedDate: info.file.lastModifiedDate,
                    size: info.file.size,
                    type: info.file.type,
                    data: Base64.encode(info.data)
                };

                $scope.files.forEach(function (existingFi, index) {
                    if (existingFi.title == fi.title) {
                        existingIndex = index;
                    }
                });

                if (existingIndex == null) {
                    $scope.files.push(fi);              //add
                } else {
                    $scope.files[existingIndex] = fi;   //replace
                }

                $scope.loadedFiles++;

                return fi;
            }).then(function (fi) {
                return LocalFileManager.saveDatabase({
                    title: fi.title,
                    data: fi.data,
                    lastModified: fi.lastModified
                });
            });
        });

        Promise.all(filePromises).then(function () {
            $scope.$apply();
        });
    };

    $scope.removePasswordFile = function (fi) {
        LocalFileManager.deleteDatabase(fi).then(function () {
            return LocalFileManager.listDatabases();
        }).then(function (files) {
            $scope.loadedFiles = 0;
            $scope.files = files;
            $scope.$apply();
        });
    };

    LocalFileManager.listDatabases().then(function (files) {
        $scope.files = files;
        $scope.$apply();
    });
};