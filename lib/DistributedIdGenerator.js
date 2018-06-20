'use strict';

const fs = require('fs');
const path = require('path');

const IdDefinition = require('./IdDefinition');
const Id = require('./Id');


class DistributedIdGenerator {
	constructor() {
		this.cryptoSecretkey = 'change-me';
		this.guardstore = null;
		this.definitions = {};
		// meta classes
		this.IdClass = class extends Id { get guardstore() { return this.guardstore; } get cryptoSecretkey() { return this.cryptoSecretkey; } };
	}

	loadDefinitions(dir) {
		if (!fs.existsSync(dir))
			throw new Error(`Directory ${dir} does not exists`);

		fs.readdirSync(dir).forEach((file) => {
			const fullPath = path.join(dir, file);

			// load only .js files
			if (!fs.statSync(fullPath).isFile() || path.extname(fullPath) !== '.js')
				return;

			const defintion = require(fullPath); // eslint-disable-line
			// do not proceed with non related files
			if (!(defintion instanceof IdDefinition))
				return;

			defintion.setIDClass(this.IdClass);
			this.definitions[defintion.name] = defintion;
		});

		return this;
	}

	setSecretKey(key) {
		this.cryptoSecretkey = key;
		return this;
	}

	setGuardstore(store) {
		this.guardstore = store;
		return this;
	}

	configureGuardStore(options) {
		const Guardstore = require('./RedisGuardstore'); // eslint-disable-line global-require
		return this.setGuardstore(new Guardstore(options));
	}

	static get IdDefinition() {
		return IdDefinition;
	}
}

module.exports = DistributedIdGenerator;
