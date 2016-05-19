'use strict';
var _CKP = _CKP || {};

_CKP.Directives = _CKP.Directives || {};

_CKP.Directives.icon = function icon() {
    return {
        restrict: 'E',
        link: function (scope, element, attrs) {
            var icon = element.scope()[attrs.p] || attrs.p;
    
            element.replaceWith('<svg class="icon ' + icon + '"><use xlink:href="#' + icon + '"></use></svg>');
        }
    };
};