'use strict';
var _CKP = _CKP || {};

_CKP.Popup = _CKP.Popup || {};
_CKP.Popup.Controller = _CKP.Popup.Controller || {};

_CKP.Popup.Controller.FindEntryController = function FindEntryController($scope, UnlockedState, SecureCacheDisk) {
    $scope.filter = '';
    $scope.unlockedState = UnlockedState;

    SecureCacheDisk.get('entries').then(function (entries) {
        UnlockedState.setEntries(entries);
        $scope.allEntries = entries;
        createEntryFilters(entries);
        $scope.$apply();
    });

    SecureCacheDisk.get('streamKey').then(function (streamKey) {
        UnlockedState.setStreamKey(streamKey);
    });

    $scope.filterKey = function () {
        var filter;

        if (!$scope.filter) {
            UnlockedState.setEntries($scope.allEntries);
            return;
        }

        filter = $scope.filter.toLocaleLowerCase();

        UnlockedState.setEntries($scope.allEntries.filter(function (entry) {
            return (entry.filterKey.indexOf(filter) > -1);
        }));
    };

    function createEntryFilters(entries) {
        entries.forEach(function (entry) {
            var filters = [];

            collectFilters(entry, filters);
            entry.filterKey = filters.join(' ');
        });
    }

    function collectFilters(data, collector) {
        if (data === null || data === undefined) {
            return data;
        }

        if (data.constructor == ArrayBuffer || data.constructor == Uint8Array) {
            return null;
        } else if (typeof data === 'string') {
            collector.push(data.toLocaleLowerCase());
        } else if (data.constructor == Array) {
            data.forEach(function (i) {
                collectFilters(i, collector);
            });
        } else {
            Object.keys(data).forEach(function (prop) {
                collectFilters(data[prop], collector);
            });
        }
    }
};