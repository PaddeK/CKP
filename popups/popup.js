/**

The MIT License (MIT)

Copyright (c) 2015 Steven Campbell.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

 */

'use strict';
var _CKP = _CKP || {};

_CKP.Popup = _CKP.Popup || {};
_CKP.Popup.Routes = _CKP.Popup.Routes || {};
_CKP.Popup.Controller = _CKP.Popup.Controller || {};

_CKP.Popup.Routes.$config = '/popups/routes.json';
_CKP.Popup.Routes.$default = '/startup';
_CKP.Popup.Directives = ['icon', 'fileChange', 'autoFocus', 'droppable', 'staticInclude'];
_CKP.Popup.Services = [
    'ProtectedMemory', 'SecureCacheMemory', 'Settings', 'SecureCacheDisk', 'KeyFileParser', 'OptionsLink', 'KeepassDb',
    'KeepassHeader', 'UnlockedState'
];

_CKP.Boot(_CKP.Popup, 'keepassApp', ['ngAnimate', 'ngRoute', 'ngSanitize']);

_CKP.Popup.Module.factory('Pako', function() {
    return pako;
});