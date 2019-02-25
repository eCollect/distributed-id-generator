'use strict';

// const Id = require('./Id');
const idSectionDefinitions = require('./idSectionsDefinitions');
// const IdSectionDefinition = require('./id-section-definition');

const calculateModulu = (size) => {
	if (size < 2)
		throw new Error('Id size must be at least 2!');

	return 10 ** (size - 1);
};

module.exports = class IdDefinition {
	constructor(name, size, prefix, type = 'numeric') {
		this.DefinitionClass = idSectionDefinitions[type];
		if (!this.DefinitionClass)
			throw new Error('Unknown definition type');

		this.regex = '';
		this.definition = new this.DefinitionClass(name, size);
		this.prefix = prefix === undefined || prefix === null ? name.substr(0, 3) : prefix;
		this.sections = [];
		this.numericSize = size || 6;
		this.modulu = calculateModulu(this.size);
		this.Id = null;
	}

	mongoosePlugin(formatted = false) {
		return (schema) => {
			schema.add({
				_id: String,
			});
			const definition = this;
			schema.pre('save', async function save(next) {
				if (!this.isNew || this._id)
					return next();
				const id = await definition.startNew().setNextNewId();
				this._id = id.toString(formatted);
				return next();
			});
		};
	}

	setIDClass(IdClass) {
		this.Id = IdClass;
	}

	get name() {
		return this.definition.name;
	}

	get size() {
		return this.definition.size;
	}

	_addSection(name, size, type = 'numeric') {
		let sectionInstance = (name instanceof idSectionDefinitions.IdSectionDefinitionBase) ? name : null;

		if (!sectionInstance) {
			const SectionClass = (typeof type === 'string') ? idSectionDefinitions[type] : type.constructor;
			if (!SectionClass)
				throw new Error('Unknown definition type');

			sectionInstance = new SectionClass(name, size);
		}

		this.sections.push(sectionInstance);
		this.numericSize += sectionInstance.size;
		this._recalculateRegex();
		return this;
	}

	_recalculateRegex() {
		this.regex = [...this.sections, this.definition].map(s => `(${s.getRegex()})`).join('[-]?');
	}

	/**
	 * Clears currenct state for this definition
	 */
	clear() {
		return new this.Id(this).clear();
	}

	/**
	 * starts a new, based on existing id, use for extended ids, CAREFULLY
	 * @param {object|Id} id - Existing Id instance
	 */
	startNewBasedOn(id) {
		const obj = (id.toObject) ? id.toObject() : id;
		return new this.Id(this).setSections(obj);
	}

	/**
	 * starts a new, non crypted, non checksumed id, BE CAREFUL most probably you don't need it!
	 * @param {number} value? - the own Id value of the new id
	 */
	startNew(value) {
		const id = new this.Id(this);
		if (value)
			id.setNewId(value);
		return id;
	}

	/**
	 * get previous if based on date and value
	 * @param {number} value? - the own Id value of the new id
	 */
	getPrevious({ date, value }) {
		if (!date || ! value)
			throw new Error('date and value are requierd.');

		const id = new this.Id(this);
		return id.setPreviousId({ date, value });
		return id;
	}

	getPreviousBasedOn(id, { date, value }) {
		if (!date || ! value)
			throw new Error('date and value are requierd.');

		const obj = (id.toObject) ? id.toObject() : id;
		const id = new this.Id(this).setSections(obj);
		return id.setPreviousId({ date, value });
	}


	toId(value) {
		return new this.Id(this).setId(value);
	}

	tryParse(str) {
		return this.Id.tryParse(this, str);
	}

	parse(str) {
		return this.Id.parse(this, str);
	}

	extend(name, size, prefix, type = 'numeric') {
		const extendedDefinition = new IdDefinition(name, size, prefix, type);
		this.sections.forEach((section) => {
			extendedDefinition._addSection(section);
		});
		extendedDefinition._addSection(this.definition);
		return extendedDefinition;
	}

	static extendFrom(definition, name, size, prefix) {
		return definition.extend(name, size, prefix);
	}
};
