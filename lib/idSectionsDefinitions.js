'use strict';

const base32 = require('./base32');
const fe1 = require('node-fe1-fpe');

const padNumber = (num, size, char = '0') => {
	let str = num.toString();

	while (str.length < size)
		str = char + str;

	return str;
};

const calculateModulu = (size) => {
	if (size < 2)
		throw new Error('Id size must be at least 2!');

	return 10 ** (size - 1);
};

const calculateModulu32 = (size) => {
	if (size < 6)
		throw new Error('Id size must be at least 5!');

	return 32 ** (size - 4);
};

class IdSectionDefinitionBase {
	constructor(name, size) {
		this.name = name;
		this.size = size || 6;
		this._modulu = calculateModulu(this.size);
	}

	static _decode(value) {
		return value;
	}

	static _encode(value) {
		return value;
	}

	getNext(guardstore, id) {
		const sectionValues = [];
		if (id._sectionsArray.length > 1)
			for (let i = 0; i < id._sectionsArray.length - 1; i++) {
				const section = id._sectionsArray[i];
				if (section.value === undefined)
					throw new Error(`No value is set on section ${section.name}, in id ${id._definition.name}`);
				sectionValues.push(section.value);
			}
		return guardstore.getNext(this.name, sectionValues);
	}

	hash(id, secretKey) {
		return fe1.encrypt(this._modulu, id, secretKey, this.name);
	}

	format(id) {
		return padNumber(id, this.size - 1);
	}

	decode(value) {
		return this.constructor._decode(value);
	}
}


class Base32IdSectionDefinition extends IdSectionDefinitionBase {
	constructor(name, size) {
		super(name, size);
		this._modulu = calculateModulu32(size);
	}

	static _decode(value) {
		return base32.toInt(value);
	}

	static _encode(value) {
		return base32.fromInt(value);
	}

	async getNext(guardstore, id) {
		const sectionValues = [];
		if (id._sectionsArray.length > 1)
			for (let i = 0; i < id._sectionsArray.length - 1; i++) {
				const section = id._sectionsArray[i];
				if (section.value === undefined)
					throw new Error(`No value is set on section ${section.name}, in id ${id._definition.name}`);
				sectionValues.push(section.value);
			}
		const date32 = base32.fromDate();
		return {
			value: await guardstore.getNextDate(this.name, sectionValues, date32),
			date32,
		};
	}

	hash(id, secretKey) { // eslint-disable-line class-methods-use-this
		const hashedId = fe1.encrypt(this._modulu, id.value, secretKey, this.name);
		return {
			value: base32.fromInt(hashedId),
			date32: id.date32,
		};
	}

	format(id) { // eslint-disable-line class-methods-use-this
		return `${id.date32}${padNumber(id.value, this.size - 4, 'U')}`;
	}
}

module.exports = {
	IdSectionDefinitionBase,
	base32: Base32IdSectionDefinition,
	numeric: IdSectionDefinitionBase,
};
