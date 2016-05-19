'use strict';
var _CKP = _CKP || {};

_CKP.Directives = _CKP.Directives || {};

// autofocus, from an answer at http://stackoverflow.com/questions/14833326/how-to-set-focus-on-input-field
_CKP.Directives.autoFocus = function autoFocus($timeout) {
    return {
        restrict: 'AC',
        link: function (scope, element) {
            $timeout(function (){
                element[0].focus();
            });
        }
    };
};
