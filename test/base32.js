'use strict';

const base32 = require('../lib/base32');

console.log(base32.toInt(base32.fromInt(1234)));

