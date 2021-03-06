'use strict';

const debug = require( 'debug' )( 'skiff.incoming-dispatcher' );
const Writable = require( 'stream' ).Writable;
const merge = require( 'deepmerge' );

const defaultOptions = {
	maxPending: 100,
	objectMode: true
};

class Dispatcher extends Writable {

	constructor( options = {} ) {
		options = merge( defaultOptions, options || {} );

		super( options );

		this._options = options;
		this._pending = [];
	}

	next() {
		return this._pending.shift();
	}

	_write( message, _, callback ) {
		debug( '_write %j', message );
		this._pending.push( message );
		this._cap();
		callback();
		this.emit( 'readable' );
	}

	_cap() {
		// cap at the bottom, remove the oldest messages if we need space
		if ( this._pending.length > this._options.maxPending ) {
			this._pending.splice( 0, this._pending.length - this._options.maxPending );
		}
	}

}

module.exports = Dispatcher;
