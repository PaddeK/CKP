'use strict';
var _CKP = _CKP || {};

_CKP.Boot = function (namespace, app, requires) {
    namespace.Module = angular.module(app, requires || []);

    // autoload controllers
    Object.keys(namespace.Controller).forEach(function (ctrlName) {
        var ctrl = namespace.Controller[ctrlName];

        namespace.Module.controller(ctrlName, angular.injector.$$annotate(ctrl).concat(ctrl));
    });

    // route config
    namespace.Module.config(['$routeProvider', function ($routeProvider) {
        namespace.Routes.$provider = $routeProvider;
    }]);

    // autoload routes
    namespace.Module.run(['$rootScope', '$http', '$route', function ($rootScope, $http, $route) {
        $http.get(namespace.Routes.$config).success(function (routes) {
            Object.keys(routes).forEach(function (route) {
                namespace.Routes.$provider.when(namespace.Routes[routes[route].ctrl] || '/' + route, {
                    templateUrl: chrome.extension.getURL(routes[route].url), controller: routes[route].ctrl
                });
            });

            namespace.Routes.$provider.otherwise({redirectTo: namespace.Routes.$default});

            $route.reload();
        });
    }]);

    // autoload directives
    if(!namespace.Directives.every(function (directive) {
        return !!_CKP.Directives[directive] && namespace.Module.directive(directive, _CKP.Directives[directive]);
    })) throw new Error('Directive missing');

    // autoload FileSourceRegistry
    namespace.Module.factory('FileSourceRegistry', Object.keys(_CKP.FileManager).concat(function () {
        var args = [null].concat(Array.prototype.slice.call(arguments));

        return new (_CKP.Services.FileSourceRegistry.bind.apply(_CKP.Services.FileSourceRegistry, args));
    }));

    // autoload FileManagers
    Object.keys(_CKP.FileManager).forEach(function (fileManager) {
        var fileMgr = _CKP.FileManager[fileManager];

        namespace.Module.factory(fileManager, angular.injector.$$annotate(fileMgr).concat(function () {
            return new (fileMgr.bind.apply(fileMgr, [null].concat(Array.prototype.slice.call(arguments))));
        }));
    });

    // autoload services
    if(!namespace.Services.every(function (service) {
        var srv = _CKP.Services[service];
        return !!srv && namespace.Module.factory(service, angular.injector.$$annotate(srv).concat(function () {
            return new (srv.bind.apply(srv, [null].concat(Array.prototype.slice.call(arguments))));
        }));
    })) throw new Error('Service missing');
};