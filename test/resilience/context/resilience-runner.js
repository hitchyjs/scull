/**
 * (c) 2019 cepharum GmbH, Berlin, http://cepharum.de
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2019 cepharum GmbH
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @author: cepharum
 */

"use strict";

const { test, setup, teardown } = require( "mocha" );

const Setup = require( "./setup" );
const ResilienceTestClient = require( "./client" );

function isFalse( value ) {
	return /^\s*(?:no?|0|off|f(?:alse)?)\s*$/i.test( value );
}


module.exports = function( options ) {
	let client;

	if ( ( options.chaos && isFalse( process.env.CHAOS ) ) ||
	     ( !options.chaos && isFalse( process.env.ORDER ) ) ||
	     ( options.persist && isFalse( process.env.DISK ) ) ||
	     ( !options.persist && isFalse( process.env.MEMORY ) )
	) {
		test.skip( "works", () => {} );
		return;
	}

	const { before, after, addresses, isLive, LogServer, stopChaos } = Setup( Object.assign( {
		nodeCount: Math.max( process.env.NODES_COUNT || 3, 3 ),
		onTimeElapsed
	}, options ) );

	setup( before );
	teardown( after );


	const duration = Math.max( parseInt( process.env.DURATION_MINS ) || 10, 1 );

	test( "works", function() {
		LogServer.log( "starting test for %d minute(s)", duration );

		this.timeout( Math.max( duration + 2, duration * 1.02 ) * 60000 );

		return new Promise( ( resolve, reject ) => {
			let timeout = null;

			client = new ResilienceTestClient( addresses, {
				duration: duration * 60000,
				isLive,
				// nextStep: endpoints => ( { key: "c", put: true } ),
				stopChaos,
			} );

			resetOperationTimeout();
			client.on( "operation", resetOperationTimeout );
			client.on( "warning", () => {
				reject( new Error( "server process writing to stderr unexpectedly" ) );
			} );

			client.start()
				.then( () => {
					clearTimeout( timeout );
					onTimeElapsed();
					resolve();
				} )
				.catch( error => {
					clearTimeout( timeout );
					onTimeElapsed();
					reject( error );
				} );


			/**
			 * Handles single request in a sequence of testing requests having
			 * timed out.
			 *
			 * @returns {void}
			 */
			function onOperationTimeout() {
				reject( new Error( "no operation for more than 11 seconds" ) );
			}

			/**
			 * Resets per-request timeout detection due to client having started
			 * another request.
			 *
			 * @returns {void}
			 */
			function resetOperationTimeout() {
				if ( timeout ) {
					clearTimeout( timeout );
				}

				timeout = setTimeout( onOperationTimeout, 11000 );
			}
		} )
			.catch( error => LogServer.dump( 1 ).then( () => { throw error; } ) );
	} );

	function onTimeElapsed( minutes = null ) {
		if ( client ) {
			const { operationsStarted, operationsCompleted,
				readOperationsCompleted, writeOperationsCompleted,
				sumClientReadLatency, sumClusterReadLatency,
				sumClientWriteLatency, sumClusterWriteLatency } = client.stats;

			LogServer.log( "%d started, %d completed %s",
				operationsStarted, operationsCompleted,
				minutes == null ? "" : `after ${minutes} minute(s)` );

			const avgNetReadLatency = sumClusterReadLatency / readOperationsCompleted;
			const avgGrossReadLatency = sumClientReadLatency / readOperationsCompleted;

			LogServer.log( "net  read latency %s ms/op (%s op/s), gross  read latency %s ms/op (%s op/s)",
				Math.round( 10 * avgNetReadLatency ) / 10,
				Math.round( 10000 / avgNetReadLatency ) / 10,
				Math.round( 10 * avgGrossReadLatency ) / 10,
				Math.round( 10000 / avgGrossReadLatency ) / 10 );

			const avgNetWriteLatency = sumClusterWriteLatency / writeOperationsCompleted;
			const avgGrossWriteLatency = sumClientWriteLatency / writeOperationsCompleted;

			LogServer.log( "net write latency %s ms/op (%s op/s), gross write latency %s ms/op (%s op/s)",
				Math.round( 10 * avgNetWriteLatency ) / 10,
				Math.round( 10000 / avgNetWriteLatency ) / 10,
				Math.round( 10 * avgGrossWriteLatency ) / 10,
				Math.round( 10000 / avgGrossWriteLatency ) / 10 );

			const avgNetLatency = ( sumClusterWriteLatency + sumClusterReadLatency ) / operationsCompleted;
			const avgGrossLatency = ( sumClientWriteLatency + sumClientReadLatency ) / operationsCompleted;

			LogServer.log( "net total latency %s ms/op (%s op/s), gross total latency %s ms/op (%s op/s)",
				Math.round( 10 * avgNetLatency ) / 10,
				Math.round( 10000 / avgNetLatency ) / 10,
				Math.round( 10 * avgGrossLatency ) / 10,
				Math.round( 10000 / avgGrossLatency ) / 10 );
		}
	}
};
