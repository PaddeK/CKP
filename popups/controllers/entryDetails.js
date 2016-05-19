'use strict';
var _CKP = _CKP || {};

_CKP.Popup = _CKP.Popup || {};
_CKP.Popup.Controller = _CKP.Popup.Controller || {};
_CKP.Popup.Routes = _CKP.Popup.Routes || {};
_CKP.Popup.Routes.EntryDetailsController = '/entryDetails/:entryId';

_CKP.Popup.Controller.EntryDetailsController = function EntryDetailsController(
    $scope, $routeParams, $location, UnlockedState)
{
	var entryId = $routeParams.entryId;

	$scope.unlockedState = UnlockedState;

	$scope.entry = UnlockedState.getEntries().filter(function (entry) {
        return entry.id == entryId;
	})[0];

	$scope.attributes = $scope.entry.keys.map(function (key) {
		return {
			key: key,
			value: ($scope.entry[key] || '').replace(/\n/g, "<br>")
		};
	});

    Object.keys($scope.entry.protectedData).forEach(function (protectedKey) {
		$scope.attributes.push({
			key: protectedKey,
			value: '',
			protected: true,
			protectedAttr: $scope.entry.protectedData[protectedKey]
		});
    });

	$scope.exposeAttribute = function (attr) {
		attr.value = UnlockedState.getDecryptedAttribute(attr.protectedAttr);
	};

	$scope.goBack = function () {
		$location.path('/startup');
	};
};
