'use strict';

const digits = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'.split('');
const digitsMap = digits.reduce((r, c, i) => {
	r[c] = i;
	return r;
}, {});
const beginningYear = 2014;

module.exports = {
	regexCharters: '0-9A-HJKMNP-TV-Z',
	digits,
	map: digitsMap,
	// int
	fromInt(int32) {
		let result = '';
		do {
			result = digits[int32 & 0x1f] + result; // eslint-disable-line no-bitwise
			int32 >>>= 5; // eslint-disable-line no-bitwise
		} while (int32 !== 0);
		return result;
	},
	toInt(digitsStr) {
		const digitsInput = digitsStr.split('');
		return digitsInput.reduce((r, c) => (r << 5) + digitsMap[c], 0); // eslint-disable-line no-bitwise
	},
	// date
	fromDate(date = new Date()) {
		const year = date.getUTCFullYear() - beginningYear;
		const month = date.getUTCMonth();
		const day = date.getUTCDate();
		return `${digits[year]}${digits[month]}${digits[day]}`;
	},
	toDate(dateStr) {
		if (dateStr.length !== 3)
			throw new Error('Invalid Base32 Date String');
		return Number.parseInt(`${digitsMap[dateStr[0]]}${digitsMap[dateStr[1]]}${digitsMap[dateStr[2]]}`, 10);
	},
};
