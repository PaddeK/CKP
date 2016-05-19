'use strict';
var _CKP = _CKP || {};

_CKP.Directives = _CKP.Directives || {};

// http://stackoverflow.com/questions/12393703/how-to-include-one-partials-into-other-without-creating-a-new-scope
_CKP.Directives.staticInclude = function staticInclude($http, $templateCache, $compile) {
    return function (scope, element, attrs) {
        $http.get(attrs.staticInclude, {cache: $templateCache}).success(function (response) {
            $compile(element.html(response).contents())(scope);
		});
	};
};