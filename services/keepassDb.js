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

_CKP.Services = _CKP.Services || {};

/**
 * Service for opening keepass files
 */
_CKP.Services.KeepassDb = function KeepassDb(KeepassHeader, Pako, Settings, FileSourceRegistry) {
    var _streamKey = null,
        littleEndian = (function () {
            var buffer = new ArrayBuffer(2);
            new DataView(buffer).setInt16(0, 256, true);
            return new Int16Array(buffer)[0] === 256;
        })();

    return {
        getStreamKey: getStreamKey,
        getMasterKey: getMasterKey,
        getPasswords: getPasswords,
        getDecryptedEntry: getDecryptedEntry
    };

    function getStreamKey() {
        return _streamKey;
    }

    function getKey(isKdbx, masterPassword, keyFile) {
        var encoder, masterKey,
            partPromises = [],
            SHA = {name: 'SHA-256'};

        if (masterPassword || !keyFile) {
            encoder = new TextEncoder();
            masterKey = encoder.encode(masterPassword);
            partPromises.push(window.crypto.subtle.digest(SHA, new Uint8Array(masterKey)));
        }

        if (keyFile) {
            partPromises.push(Promise.resolve(keyFile));
        }

        return Promise.all(partPromises).then(function (parts) {
            var compositeKeySource,
                i = 0;

            if (isKdbx || partPromises.length > 1) {
                // kdbx, or kdb with keyFile + masterPassword, do the SHA a second time
                compositeKeySource = new Uint8Array(32 * parts.length);

                for (; i < parts.length; i++) {
                    compositeKeySource.set(new Uint8Array(parts[i]), i * 32);
                }

                return window.crypto.subtle.digest(SHA, compositeKeySource);
            }

            // kdb with just only keyFile or masterPassword (don't do a second SHA digest in this scenario)
            return partPromises[0];
        });
    }

    function getMasterKey(masterPassword, keyFileInfo) {
        var keyFile = keyFileInfo ? Base64.decode(keyFileInfo.encodedKey) : null;

        return FileSourceRegistry.getChosenDatabaseFile(Settings).then(function (buf) {
            var header = KeepassHeader.readHeader(buf);

            return getKey(header.kdbx, masterPassword, keyFile);
        });
    }

    function getPasswords(masterKey) {
        return FileSourceRegistry.getChosenDatabaseFile(Settings).then(function (buf) {
            var encData,
                header = KeepassHeader.readHeader(buf),
                SHA = {name: 'SHA-256'},
                AES = {
                    name: 'AES-CBC',
                    iv: header.iv
                };

            if (!header) {
                throw new Error('Failed to read file header');
            }

            if (header.innerRandomStreamId != 2 && header.innerRandomStreamId != 0) {
                throw new Error(
                    'Invalid Stream Key - Salsa20 is supported by this implementation, Arc4 and others not implemented.'
                );
            }
    
            encData = new Uint8Array(buf, header.dataStart);

            return aes_ecb_encrypt(header.transformSeed, masterKey, header.keyRounds).then(function (finalVal) {
                // do a final SHA-256 on the transformed key
                return window.crypto.subtle.digest(SHA, finalVal);
            }).then(function (encMasterKey) {
                var finalKeySource = new Uint8Array(header.masterSeed.byteLength + 32);

                finalKeySource.set(header.masterSeed);
                finalKeySource.set(new Uint8Array(encMasterKey), header.masterSeed.byteLength);

                return window.crypto.subtle.digest(SHA, finalKeySource);
            }).then(function (finalKeyBeforeImport) {
                return window.crypto.subtle.importKey('raw', finalKeyBeforeImport, AES, false, ['decrypt']);
            }).then(function (finalKey) {
                return window.crypto.subtle.decrypt(AES, finalKey, encData);
            }).then(function (decryptedData) {
                var blockHeader, blockSize, allBlocks,
                    done = false,
                    pos = 32,
                    totalDataLength = 0,
                    blockArray = [];

                // at this point we probably have successfully decrypted data, just need to double-check:
                if (header.kdbx) {
                    // kdbx
                    if (!new Uint8Array(decryptedData, 0, 32).every(function (byte, idx) {
                        return byte == header.streamStartBytes[idx];
                    })) throw new Error('Decryption succeeded but payload corrupt');

                    // ok, data decrypted, lets start parsing:
                    while (!done) {
                        blockHeader = new DataView(decryptedData, pos, 40);
                        blockSize = blockHeader.getUint32(36, littleEndian);

                        if (blockSize > 0) {
                            blockArray.push(new Uint8Array(decryptedData, pos + 40, blockSize));
                            totalDataLength += blockSize;
                            pos += blockSize + 40;
                            continue;
                        }

                        done = true;
                    }

                    allBlocks = new Uint8Array(totalDataLength);
                    pos = 0;

                    blockArray.forEach(function (block) {
                        allBlocks.set(block, pos);
                        pos += block.byteLength;
                    });

                    if (header.compressionFlags == 1) {
                        allBlocks = Pako.inflate(allBlocks);
                    }

                    return parseXml(new TextDecoder().decode(allBlocks), header.protectedStreamKey);
                }

                return parseKdb(decryptedData, header);
            });
        });
    }

    function readField(readFunc, buf, dataView, state, initial) {
        var fieldType = 0,
            fieldSize = 0,
            preventInfinite = 100;

        while (fieldType != 0xFFFF && preventInfinite > 0) {
            fieldType = dataView.getUint16(state.pos, littleEndian);
            fieldSize = dataView.getUint32(state.pos + 2, littleEndian);
            state.pos += 6;

            readFunc(fieldType, fieldSize, buf, state.pos, initial);

            state.pos += fieldSize;
            preventInfinite--;
        }

        return initial;
    }

    // parse kdb file:
    function parseKdb(buf, h) {
        var salsa = new Salsa20(new Uint8Array(_streamKey), [0xE8, 0x30, 0x09, 0x4B, 0x97, 0x20, 0x5D, 0x2A]);

        return window.crypto.subtle.digest({name: 'SHA-256'}, h.protectedStreamKey).then(function (streamKey) {
            var i, currentEntry, passwordBytes, encPassword, isMetaInfo, isSystemUser, isInvalidGroup,
                salsaPosition = 0,
                state = {pos: 0},
                groups = [],
                entries = [],
                dv = new DataView(buf);

            _streamKey = streamKey;

            for (i = 0; i < h.numberOfGroups; i++) {
                groups.push(readField(readGroupField, buf, dv, state, {}));
            }

            for (i = 0; i < h.numberOfEntries; i++) {
                currentEntry = readField(readEntryField, buf, dv, state, {keys: []});

                currentEntry.group = groups.filter(function (grp) {
                    return grp.id == currentEntry.groupId;
                })[0];

                currentEntry.groupName = currentEntry.group.name;
                currentEntry.keys.push('groupName');

                // in-memory-protect the password in the same way as on KDBX
                if (currentEntry.password) {
                    passwordBytes = new TextEncoder().encode(currentEntry.password);
                    encPassword = salsa.encrypt(new Uint8Array(passwordBytes));

                    currentEntry.protectedData = {
                        password: {
                            data: encPassword,
                            position: salsaPosition
                        }
                    };
                    currentEntry.password = Base64.encode(encPassword);  //overwrite the unencrypted password

                    salsaPosition += passwordBytes.byteLength;
                }

                isMetaInfo = currentEntry.title == 'Meta-Info';
                isSystemUser = currentEntry.userName == 'SYSTEM';
                isInvalidGroup = ['Backup', 'Search Results'].indexOf(currentEntry.groupName) !== -1;

                if (!isMetaInfo && !isSystemUser && !isInvalidGroup) {
                    entries.push(currentEntry);
                }
            }

            return entries;
        });
    }

    // read KDB entry field
    function readEntryField(fieldType, fieldSize, buf, pos, entry) {
        var decoder = new TextDecoder(),
            dv = new DataView(buf, pos, fieldSize),
            arr = [];

        if (fieldSize > 0) {
            arr = new Uint8Array(buf, pos, fieldSize - 1);
        }

        switch (fieldType) {
            case 0x0000:
                // Ignore field
                break;
            case 0x0001:
                entry.id = convertArrayToUUID(new Uint8Array(buf, pos, fieldSize));
                break;
            case 0x0002:
                entry.groupId = dv.getUint32(0, littleEndian);
                break;
            case 0x0003:
                entry.iconId = dv.getUint32(0, littleEndian);
                break;
            case 0x0004:
                entry.title = decoder.decode(arr);
                entry.keys.push('title');
                break;
            case 0x0005:
                entry.url = decoder.decode(arr);
                entry.keys.push('url');
                break;
            case 0x0006:
                entry.userName = decoder.decode(arr);
                entry.keys.push('userName');
                break;
            case 0x0007:
                entry.password = decoder.decode(arr);
                break;
            case 0x0008:
                entry.notes = decoder.decode(arr);
                entry.keys.push('notes');
                break;
            /*
            case 0x0009:
                ent.tCreation = new PwDate(buf, offset);
                break;
            case 0x000A:
                ent.tLastMod = new PwDate(buf, offset);
                break;
            case 0x000B:
                ent.tLastAccess = new PwDate(buf, offset);
                break;
            case 0x000C:
                ent.tExpire = new PwDate(buf, offset);
                break;
            case 0x000D:
                ent.binaryDesc = Types.readCString(buf, offset);
                break;
            case 0x000E:
                ent.setBinaryData(buf, offset, fieldSize);
                break;
            */
        }
    }

    // read KDB group field
    function readGroupField(fieldType, fieldSize, buf, pos, group) {
        var dv = new DataView(buf, pos, fieldSize),
            arr = [];

        if (fieldSize > 0) {
            arr = new Uint8Array(buf, pos, fieldSize - 1);
        }
    
        switch (fieldType) {
            case 0x0000:
                // Ignore field
                break;
            case 0x0001:
                group.id = dv.getUint32(0, littleEndian);
                break;
            case 0x0002:
                var decoder = new TextDecoder();
                group.name = decoder.decode(arr);
                break;
            /*
            case 0x0003:
                group.tCreation = new PwDate(buf, offset);
                break;
            case 0x0004:
                group.tLastMod = new PwDate(buf, offset);
                break;
            case 0x0005:
                group.tLastAccess = new PwDate(buf, offset);
                break;
            case 0x0006:
                group.tExpire = new PwDate(buf, offset);
                break;
            case 0x0007:
                group.icon = db.iconFactory.getIcon(LEDataInputStream.readInt(buf, offset));
                break;
            case 0x0008:
                group.level = LEDataInputStream.readUShort(buf, offset);
                break;
            case 0x0009:
                group.flags = LEDataInputStream.readInt(buf, offset);
                break;
            */
        }
    }

    /**
     * Returns the decrypted data from a protected element of a KDBX entry
     */
    function getDecryptedEntry(protectedData, streamKey) {
        var iv = [0xE8, 0x30, 0x09, 0x4B, 0x97, 0x20, 0x5D, 0x2A],
            salsa = new Salsa20(new Uint8Array(streamKey || _streamKey), iv);

        if (protectedData === undefined) {
            return ''; //can happen with entries with no password
        }
    
        salsa.getBytes(protectedData.position);

        return new TextDecoder().decode(new Uint8Array(salsa.decrypt(protectedData.data)));
    }

    /**
     * Parses the KDBX entries xml into an object format
     */
    function parseXml(xml, protectedStreamKey) {
        return window.crypto.subtle.digest({name: 'SHA-256'}, protectedStreamKey).then(function (streamKey) {
            var i, m, j, entryNode, entry, groupNode, childNode, key, valNode, val, protectedVal, encBytes,
                doc = new DOMParser().parseFromString(xml, 'text/xml'),
                results = [],
                entryNodes = doc.evaluate('//Entry', doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null),
                protectedPosition = 0;

            _streamKey = streamKey;

            for (i = 0; i < entryNodes.snapshotLength; i++) {
                entryNode = entryNodes.snapshotItem(i);

                entry = {
                    protectedData: {},
                    keys: []
                };
    
                // exclude histories and recycle bin:
                if (entryNode.parentNode.nodeName != 'History') {
                    entry.searchable = true;

                    for (m = 0; m < entryNode.parentNode.children.length; m++) {
                        groupNode = entryNode.parentNode.children[m];

                        if (groupNode.nodeName == 'Name') {
                            entry.groupName = groupNode.textContent;
                            entry.keys.push('groupName')
                        } else if (groupNode.nodeName == 'EnableSearching' && groupNode.textContent == 'false') {
                            // this group is not searchable
                            entry.searchable = false;
                        }
                    }
    
                    if (entry.searchable) {
                        results.push(entry);
                    }
                }

                for (j = 0; j < entryNode.children.length; j++) {
                    childNode = entryNode.children[j];

                    if (childNode.nodeName == 'UUID') {
                        entry.id = convertArrayToUUID(Base64.decode(childNode.textContent));
                    } else if (childNode.nodeName == 'IconID') {
                        entry.iconId = Number(childNode.textContent);  // integer
                    } else if (childNode.nodeName == 'Tags' && childNode.textContent) {
                        entry.tags = childNode.textContent;
                        entry.keys.push('tags');
                    } else if (childNode.nodeName == 'Binary') {
                        entry.binaryFiles = childNode.textContent;
                        entry.keys.push('binaryFiles');  // the actual files are stored elsewhere in the xml, not sure where
                    } else if (childNode.nodeName == 'String') {
                        key = Case.camel(childNode.getElementsByTagName('Key')[0].textContent);

                        if (key == 'keys') {
                            key = 'keysAlias'; // avoid name conflict when key == "keys"
                        }

                        valNode = childNode.getElementsByTagName('Value')[0];
                        val = valNode.textContent;
                        protectedVal = valNode.hasAttribute('Protected');
    
                        if (protectedVal) {
                            encBytes = new Uint8Array(Base64.decode(val));

                            entry.protectedData[key] = {
                                position: protectedPosition,
                                data: encBytes
                            };
    
                            protectedPosition += encBytes.length;
                        } else {
                            entry.keys.push(key);
                        }

                        entry[key] = val;
                    }
                }
            }

            return results;
        });
    }

    function aes_ecb_encrypt(rawKey, data, rounds) {
        var i = 0,
            bytes = new Uint8Array(data),
            blockCount = bytes.byteLength / 16,     // Simulate ECB encryption by using IV of the data.
            blockPromises = new Array(blockCount);

        for (; i < blockCount; i++) {
            blockPromises[i] = (function (iv) {
                return aes_cbc_rounds(iv, rawKey, rounds);
            })(bytes.subarray(i * 16, i * 16 + 16));
        }

        return Promise.all(blockPromises).then(function (blocks) {
            // we now have the blocks, so chain them back together
            var result = new Uint8Array(bytes.byteLength);

            for (i = 0; i < blockCount; i++) {
                result.set(blocks[i], i * 16);
            }

            return result;
        });
    }

    /**
     * Performs rounds of CBC encryption on data using rawKey
     */
    function aes_cbc_rounds(data, rawKey, rounds) {
        if (rounds == 0) {
            // just pass back the current value
            return data;
        } else if (rounds > 0xFFFF) {
            // limit memory use to avoid chrome crash:
            return aes_cbc_rounds_single(data, rawKey, 0xFFFF).then(function (result) {
                return aes_cbc_rounds(result, rawKey, rounds - 0xFFFF);
            });
        } else {
            // last iteration, or only iteration if original rounds was low:
            return aes_cbc_rounds_single(data, rawKey, rounds);
        }
    }

    function aes_cbc_rounds_single(data, rawKey, rounds) {
        var AES = {
            name: 'AES-CBC',
            iv: data
        };

        return window.crypto.subtle.importKey('raw', rawKey, AES, false, ['encrypt']).then(function (secureKey) {
            return window.crypto.subtle.encrypt(AES, secureKey, new Uint8Array(rounds * 16));
        }).then(function (result) {
            return new Uint8Array(result, (rounds - 1) * 16, 16);
        });
    }

    function convertArrayToUUID(arr) {
        var i = 0,
            int8Arr = new Uint8Array(arr),
            result = new Array(int8Arr.byteLength * 2);

        for (; i < int8Arr.byteLength; i++) {
            result[i * 2] = int8Arr[i].toString(16).toUpperCase();
        }

        return result.join('');
    }
};
