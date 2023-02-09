'use strict';

const redis = require('redis');
const { promisify } = require('util');

const DEFAULTS = {
	host: 'localhost',
	port: 6379,
	db: 1,
	prefix: 'id-guard-store',
	retry_strategy: (retries, cause) => {
		// End reconnecting on a specific error and flush all commands with a individual error
		if (cause && cause.code === 'ECONNREFUSED')
			return new Error('The server refused the connection');

		// End reconnecting with built in error
		if (retries > 10)
			return false;

		// reconnect after
		return Math.min(retries * 100, 3000);
	},
};

module.exports = class RedisGuardStore {
	constructor(options) {
		this._config = Object.assign({}, DEFAULTS, options);
		if (this._config.prefix)
			this._config.prefix += ':';

		this._client = redis.createClient({
			socket: {
				port: this._config.port,
				host: this._config.host,
				connectTimeout: this._config.timeout,
				reconnectStrategy: this._config.retry_strategy,
			},
			database: this._config.db,
			// legacyMode: true,
		});
	}

	async _connect() {
		if (!this._client.isOpen)
			await this._client.connect();
	}

	async _clear(name) {
		await this._connect();
		const keys = await this._getKeys(name);
		return Promise.all(keys.map(key => this._client.del(key)));
	}

	async _getKeys(name) {
		await this._connect();
		const prefix = this._config.prefix || '';
		return this._client.keys(`${prefix}${name}*`);
	}

	async _getNext(name, suffix) {
		await this._connect();
		const prefix = this._config.prefix || '';
		const key = `${prefix}${name}:${suffix}`;
		return this._client.incr(key);
	}

	getNext(name, sectionValues) {
		return this._getNext(name, sectionValues.join(''));
	}

	getNextDate(name, sectionValues, dateValue) {
		const suffix = `${sectionValues.join('')}:${dateValue}`;
		return this._getNext(name, suffix);
	}

	clear(name) {
		return this._clear(name);
	}

	close() {
		if (!this._client.isOpen)
			return null;
		return this._client.quit();
	}
};
