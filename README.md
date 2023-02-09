# distributed-id-generator v0.6.1

System wide singleton distributed ID generator.

The library contains the following module groups :
+ Hashing algorithms ( Base32, node-fe1-fpe )
+ Checksum generation and validation ( Modified )
+ ID Generation and validation logic.
+ Guardstore implementation - Redis backend to ensure consistent distributed ID generation

Currently two types of IDs are supported, strictly numeric or base32 alpha-numeric ones.

## Usage guidelines 

To avoid id format errors and ensure consistency between system services all external usage of the library should be through the definitions found here, after configuring the guardstore.

Example : 
```javascript
	const path = require('path');
	const DistributedIdGenerator = require('distributed-id-generator');

	const idGenerator = DistributedIdGenerator.configureGuardstore({ // Redis optional settings
		host: 'localhost', // default
		port: 6379, // default
		db: 1, // default
		prefix: 'id-guard-store', // default
	}).loadDefinitions(path.join(process.cwd(), './app/ids/'));
```

Defining Ids :
```javascript
	const { IdDefinition } = require('distributed-id-generator');

	// name, length including checksum, prefix, algorith either numeric or base32
	module.exports = new IdDefinition('account', 8, 'acc', 'base32');
```

Definition that is based on another :
```javascript
	const accountIdDefinition = require('./account');

	// this will produce ids that are : cus-XXXXXXXX-XXXXXXXX
	module.exports = accountIdDefinition.extend('customer', 8, 'cus', 'base32');
```
