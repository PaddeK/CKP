'use strict';
var _CKP = _CKP || {};

_CKP.Directives = _CKP.Directives || {};

_CKP.Directives.fileChange = function fileChange() {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var onChangeFunc = element.scope()[attrs.fileChange];

            element.bind('change', function(e) {
                var loadedFile, reader,
                    i = 0,
                    files = e.target.files,
                    loadedFiles = [];

                while (files[i]) {
                    loadedFile = new Promise(function (resolve, reject) {
                        reader = new FileReader();

                        reader.onerror = reader.onabort = (function () {
                            return function () {
                                reject(new Error('File upload failed'));
                            };
                        })();

                        reader.onloadend = (function (theFile) {
                            return function(e) {
                                resolve({data: e.target.result, file: theFile});
                            };
                        })(files[i]);

                        reader.readAsArrayBuffer(files[i++]);
                    });

                    loadedFiles.push(loadedFile);
                }

                onChangeFunc(loadedFiles);
            });
        }
    };
};