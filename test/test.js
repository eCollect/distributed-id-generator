'use strict';

const fpe1 = require('node-fe1-fpe');

const damm = require('../lib/damm');

const cfg = require('../config/config');
const Grd = require('../lib/guardstore');

cfg.setGuardstore(new Grd());


const checksum = damm.append('3Z');
const checksum1 = damm.generate('313');
// console.log(damm.generate('3Z'));
console.log(damm.verify(checksum));

const f = fpe1.encrypt(1000000000, 343888824, 'test', 'test');
const d = fpe1.decrypt(1000000000, f, 'test', 'test');
console.log(f, d);

const Id = require('../lib/id');
const IdDefinition = require('../lib/id-definition');

const def = new IdDefinition('customer', 8, '', 'base32');

// valid account : acc-38M7B9

const accountDef = require('../definitions/account');

const accountId = accountDef.tryParse('38M7B9');

// accountDef.startNew().setNextNewId().then(id => console.log(id.toString(false)));

const customerDef = require('../definitions/customer');

customerDef.startNewBasedOn(accountId).setNextNewId().then(id => console.log(id.toString(true)));

// customerDef.startNew().setNextNewId().then(id => console.log(id.toString(true)));

// const obj = def.tryParse(test);
// const res = obj.toObject();

// new Id(new IdDefinition('customer', 6)).setId(5).toString();


// test node-fe1-fpe
