'use strict';
var _CKP = _CKP || {};

_CKP.Services = _CKP.Services || {};

// simple service to link to the options page
_CKP.Services.OptionsLink = function OptionsLink() {
    return {
        go: function go() {
            chrome.runtime.openOptionsPage();
        }
    };
};
