'use strict';
var _CKP = _CKP || {};

_CKP.Directives = _CKP.Directives || {};

// based on http://blog.parkji.co.uk/2013/08/11/native-drag-and-drop-in-angularjs.html
_CKP.Directives.droppable = function droppable() {
    return {
        scope: {
            drop: '&', bin: '='
        }, link: function (scope, element) {
            var el = element[0]; // again we need the native object

            el.addEventListener('dragover', function (e) {
                e.dataTransfer.dropEffect = 'copy';
                // allows us to drop
                if (e.preventDefault) {
                    e.preventDefault();
                }

                this.classList.add('over');
                return false;
            }, false);

            el.addEventListener('dragenter', function () {
                this.classList.add('over');
                return false;
            }, false);

            el.addEventListener('dragleave', function () {
                this.classList.remove('over');
                return false;
            }, false);

            el.addEventListener('drop', function (e) {
                var loadedFile, reader,
                    i = 0,
                    files = e.dataTransfer.files,
                    loadedFiles = [];

                // Stops some browsers from redirecting.
                e.stopPropagation();
                e.preventDefault();

                this.classList.remove('over');

                while (files[i]) {
                    // Read the File objects in this FileList.
                    loadedFile = new Promise(function (resolve, reject) {
                        reader = new FileReader();

                        reader.onloadend = (function (theFile) {
                            return function (e) {
                                resolve({data: e.target.result, file: theFile});
                            };
                        })(files[i]);

                        reader.onerror = reader.onabort = (function () {
                            return function () {
                                reject(new Error('File upload failed'));
                            };
                        })(files[i]);

                        reader.readAsArrayBuffer(files[i++]);
                    });

                    loadedFiles.push(loadedFile);
                }

                // call the passed drop function
                scope.$apply(function (scope) {
                    var fn = scope.drop();

                    if (undefined === fn) {
                        fn(loadedFiles);
                    }
                });

                return false;
            }, false);
        }
    };
};
