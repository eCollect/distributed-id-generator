'use strict';

const damm = require('./damm');

const valueRegex = new RegExp(/(?:^[a-zA-Z]{3,}?(?=-))?(?:-)*([a-zA-Z0-9]+)/g);
const prefixRegex = new RegExp(/^[a-zA-Z]{3,}?(?=-)/);

const getValueSections = (str) => {
	const exp = new RegExp(valueRegex);
	const matches = [];
	let match;

	while (match = exp.exec(str)) // eslint-disable-line no-cond-assign
		matches.push(match[1]);

	if (!matches.length)
		return null;

	return matches;
};

const getValue = (str) => {
	const matches = getValueSections(str);
	if (matches === null)
		return null;
	return matches.join('');
};


const getPrefix = (str) => {
	const match = new RegExp(prefixRegex).exec(str);
	if (!match || !match.length)
		return null;
	return match[0];
};

const padNumber = (num, size, char = '0') => {
	let str = num.toString();

	while (str.length < size)
		str = char + str;

	return str;
};


module.exports = class Id {
	constructor(definition, addChecksum = false, valueSetterFn = null) {
		this._definition = definition;
		this._prepareSections(valueSetterFn);
		this._prefix = definition.prefix;
		this._addChecksum = addChecksum;
	}

	static parse(definition, str) {
		const digits = getValue(str);
		return Id._parse(definition, digits);
	}

	static tryParse(definition, str) {
		if (this._prefix !== '') {
			const inlinePrefix = getPrefix(str);

			// if it has a prefix supplied check if it matches the expected
			if (inlinePrefix && inlinePrefix !== definition.prefix)
				return null;
		}

		const digits = getValue(str);

		if (digits.length !== definition.numericSize)
			return null;

		// check the cheksum and return value if correct TODO: change function name to reflect ( probably too complicated ) operation
		return Id._parseEncoded(definition, digits, damm.verify);
	}

	// returns promise
	async setNextNewId() {
		if (!this.guardstore)
			throw new Error('No guard store is set, generation is not available');

		const id = await this._definition.definition.getNext(this.guardstore, this);

		this.setNewId(id);
		return this;
	}

	async clear() {
		if (!this.guardstore)
			throw new Error('No guard store is set, clear is not possible');

		return this._definition.definition.clear(this.guardstore, this);
	}

	setNewId(id) {
		const section = this._sections[this._definition.name];
		const hashedId = this._definition.definition.hash(id, this.cryptoSecretkey);
		section.value = this._definition.definition.format(hashedId);
		this._addChecksum = true;
		return this;
	}

	setId(id) {
		const section = this._sections[this._definition.name];
		section.value = padNumber(id, section.size - 1);
		return this;
	}

	setSection(name, value) {
		const section = this._sections[name];
		if (!section)
			throw new Error('No such section!');

		section.value = padNumber(value, section.size);
		return this;
	}

	setSections(object) {
		if (this._sectionsArray.length > 1)
			for (let i = 0; i < this._sectionsArray.length - 1; i++) {
				const section = this._sectionsArray[i];
				const value = object[section.name];
				if (value !== undefined)
					section.value = value;
			}
		return this;
	}

	toObject() {
		const result = {};
		let digits = '';
		this._sectionsArray.forEach((section) => {
			result[section.name] = section.value;
			digits += section.value;
		});

		if (this._addChecksum)
			result[this._definition.name] = result[this._definition.name] + Id._calculateChecksum(digits);

		return result;
	}

	toString(format = true) {
		let sections = (format) ?
			this._sectionsArray.map(sec => sec.value).join('-') :
			this._sectionsArray.map(sec => sec.value).join('');

		if (this._addChecksum)
			sections = `${sections}${Id._calculateChecksum(sections)}`;

		if (this._prefix)
			return `${this._prefix}-${sections}`;

		return sections;
	}

	static _calculateChecksum(digits) {
		this._addChecksum = false;
		return damm.generate(digits);
	}

	static _parse(definition, digits) {
		let cursor = 0;
		const result = new Id(definition, false, (section) => {
			const value = digits.substr(cursor, section.size);
			cursor += section.size;
			return value;
		});
		return result;
	}

	static _parseEncoded(definition, digits, check) {
		let cursor = 0;
		let value;
		let decoded = '';
		const result = new Id(definition, false, (section) => {
			value = digits.substr(cursor, section.size);
			decoded += value;
			cursor += section.size;
			return value;
		});
		if (check(decoded))
			return result;
		return null;
	}

	_prepareSections(valueSetterFn) {
		this._sections = {};
		this._sectionsArray = [];
		this._definition.sections.forEach((sectionDefinition) => {
			this._sections[sectionDefinition.name] = {
				name: sectionDefinition.name,
				value: (valueSetterFn) ? valueSetterFn(sectionDefinition) : undefined,
				encode: sectionDefinition.constructor.encode,
				size: sectionDefinition.size,
			};
			this._sectionsArray.push(this._sections[sectionDefinition.name]);
		});
		this._sections[this._definition.name] = {
			name: this._definition.name,
			value: (valueSetterFn) ? valueSetterFn(this._definition) : undefined,
			encode: this._definition.definition.constructor._decode,
			size: this._definition.size,
		};
		this._sectionsArray.push(this._sections[this._definition.name]);
	}
};
