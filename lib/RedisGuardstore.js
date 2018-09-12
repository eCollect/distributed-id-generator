'use strict';

const redis = require('redis');
const { promisify } = require('util');

const DEFAULTS = {
	host: 'localhost',
	port: 6379,
	db: 1,
	prefix: 'id-guard-store',
	retry_strategy: (options) => {
		// End reconnecting on a specific error and flush all commands with a individual error
		if (options.error && options.error.code === 'ECONNREFUSED')
			return new Error('The server refused the connection');

		// End reconnecting after a specific timeout and flush all commands with a individual error
		if (options.total_retry_time > 1000 * 60 * 60)
			return new Error('Retry time exhausted');

		// End reconnecting with built in error
		if (options.attempt > 10)
			return undefined;

		// reconnect after
		return Math.min(options.attempt * 100, 3000);
	},
};

module.exports = class RedisGuardStore {
	constructor(options) {
		this._config = Object.assign({}, DEFAULTS, options);
		if (this._config.prefix)
			this._config.prefix += ':';
		this._client = redis.createClient(this._config);
	}

	async _clear(name) {
		const delAsync = promisify(this._client.del.bind(this._client));
		const keys = await this._getKeys(name);
		return Promise.all(keys.map(key => delAsync(key.replace(this._config.prefix, ''))));
	}

	async _getKeys(name) {
		const prefix = this._config.prefix || '';
		const keysAsync = promisify(this._client.keys.bind(this._client));
		const keys = await keysAsync(`${prefix}${name}*`);
		if (!prefix)
			return keys;
		return keys.map(k => k.replace(new RegExp(`^${prefix}`), ''));
	}

	_getNext(name, suffix) {
		const prefix = `${name}:${suffix}`;
		return new Promise((resolve, reject) => {
			this._client.incr(prefix, (error, result) => {
				if (error)
					return reject(error);
				return resolve(result);
			});
		});
	}

	getNext(name, sectionValues) {
		return this._getNext(name, sectionValues.join(''));
	}

	getNextDate(name, sectionValues, dateValue) {
		const prefix = `${sectionValues.join('')}:${dateValue}`;
		return this._getNext(name, prefix);
	}

	clear(name) {
		return this._clear(name);
	}
};
