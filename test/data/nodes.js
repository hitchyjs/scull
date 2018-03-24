/**
 * (c) 2018 cepharum GmbH, Berlin, http://cepharum.de
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2018 cepharum GmbH
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

const { suite, test } = require( "mocha" );
const Should = require( "should" );

const Address = require( "../../lib/data/address" );
const Nodes = require( "../../lib/data/nodes" );


suite( "Manager for pool of nodes", () => {
	test( "is available", () => {
		Should.exists( Nodes );
	} );

	test( "can be instantiated", () => {
		( () => new Nodes() ).should.not.throw();
	} );

	test( "can be instantiated w/ initial set of addresses", () => {
		new Nodes().addresses.should.be.Array().which.is.empty();
		new Nodes( [] ).addresses.should.be.Array().which.is.empty();

		new Nodes( ["/ip4/127.0.0.1/tcp/12345"] ).addresses.should.be.Array().which.has.length( 1 );
	} );

	test( "exposes copy of list of currently valid nodes' addresses", () => {
		const pool = new Nodes();

		pool.addresses.should.be.Array().which.is.empty().and.not.equal( pool.addresses );
	} );

	test( "normalizes provided addresses provided on creation", () => {
		const pool = new Nodes( [
			"/ip4/127.0.0.1/tcp/1",
			{ id: "/ip4/127.0.0.1/tcp/2" },
			{ address: "/ip4/127.0.0.1/tcp/3" },
			{ address: "127.0.0.1", port: 4 },
			Address( "/ip4/127.0.0.1/tcp/5" ),
		] );

		pool.addresses[0].should.be.instanceOf( Address.Address ).which.has.property( "id" ).which.is.equal( "/ip4/127.0.0.1/tcp/1" );
		pool.addresses[1].should.be.instanceOf( Address.Address ).which.has.property( "id" ).which.is.equal( "/ip4/127.0.0.1/tcp/2" );
		pool.addresses[2].should.be.instanceOf( Address.Address ).which.has.property( "id" ).which.is.equal( "/ip4/127.0.0.1/tcp/3" );
		pool.addresses[3].should.be.instanceOf( Address.Address ).which.has.property( "id" ).which.is.equal( "/ip4/127.0.0.1/tcp/4" );
		pool.addresses[4].should.be.instanceOf( Address.Address ).which.has.property( "id" ).which.is.equal( "/ip4/127.0.0.1/tcp/5" );
	} );

	test( "can be instantiated w/ additionally provided local address", () => {
		( () => new Nodes( [], "/ip4/127.0.0.1/tcp/1" ) ).should.not.throw();
		( () => new Nodes( [], { id: "/ip4/127.0.0.1/tcp/2" } ) ).should.not.throw();
		( () => new Nodes( [], { address: "/ip4/127.0.0.1/tcp/3" } ) ).should.not.throw();
		( () => new Nodes( [], { address: "127.0.0.1", port: 4 } ) ).should.not.throw();
		( () => new Nodes( [], Address( "/ip4/127.0.0.1/tcp/5" ) ) ).should.not.throw();
	} );

	test( "does not expose provided address of local node w/ list of currently valid nodes' addresses", () => {
		const addresses = [
			"/ip4/127.0.0.1/tcp/1",
			{ id: "/ip4/127.0.0.1/tcp/2" },
			{ address: "/ip4/127.0.0.1/tcp/3" },
			{ address: "127.0.0.1", port: 4 },
			Address( "/ip4/127.0.0.1/tcp/5" ),
		];

		const withoutLocal = new Nodes( addresses );
		withoutLocal.addresses.should.have.length( 5 );
		Boolean( withoutLocal.addresses.find( a => a.matches( "/ip4/127.0.0.1/tcp/3" ) ) ).should.be.true();

		const withLocal = new Nodes( addresses, "/ip4/127.0.0.1/tcp/3" );
		withLocal.addresses.should.have.length( 4 );
		Boolean( withLocal.addresses.find( a => a.matches( "/ip4/127.0.0.1/tcp/3" ) ) ).should.be.false();
	} );

	test( "exposes method `has()` for testing addresses whether selecting nodes of cluster or not", () => {
		const pool = new Nodes( ["/ip4/127.0.0.1/tcp/1"] );
		pool.add( { id: "/ip4/127.0.0.1/tcp/2" } );

		pool.has( "/ip4/127.0.0.1/tcp/1" ).should.be.true();
		pool.has( { id: "/ip4/127.0.0.1/tcp/2" } ).should.be.true();
		pool.has( { address: "/ip4/127.0.0.1/tcp/1" } ).should.be.true();
		pool.has( { address: "127.0.0.1", port: 2 } ).should.be.true();
		pool.has( Address( "/ip4/127.0.0.1/tcp/1" ) ).should.be.true();

		pool.has( "/ip4/127.0.0.1/tcp/3" ).should.be.false();
		pool.has( { id: "/ip4/127.0.0.1/tcp/4" } ).should.be.false();
		pool.has( { address: "/ip4/127.0.0.1/tcp/3" } ).should.be.false();
		pool.has( { address: "127.0.0.1", port: 4 } ).should.be.false();
		pool.has( Address( "/ip4/127.0.0.1/tcp/3" ) ).should.be.false();
	} );

	test( "considers falsy addresses to be never valid", () => {
		const pool = new Nodes( ["/ip4/127.0.0.1/tcp/1"] );

		pool.has().should.be.false();
		pool.has( false ).should.be.false();
		pool.has( undefined ).should.be.false();
		pool.has( null ).should.be.false();
		pool.has( "" ).should.be.false();
	} );

	test( "considers optionally provided local address to be always part of cluster", () => {
		const pool = new Nodes( [], "/ip4/127.0.0.1/tcp/1" );

		pool.has( "/ip4/127.0.0.1/tcp/1" ).should.be.true();
		pool.has( { id: "/ip4/127.0.0.1/tcp/1" } ).should.be.true();
		pool.has( { address: "/ip4/127.0.0.1/tcp/1" } ).should.be.true();
		pool.has( { address: "127.0.0.1", port: 1 } ).should.be.true();
		pool.has( Address( "/ip4/127.0.0.1/tcp/1" ) ).should.be.true();
	} );

	test( "permits addition of another address after creation", () => {
		( () => new Nodes().add( "/ip4/127.0.0.1/tcp/1" ) ).should.not.throw();
		( () => new Nodes().add( { id: "/ip4/127.0.0.1/tcp/2" } ) ).should.not.throw();
		( () => new Nodes().add( { address: "/ip4/127.0.0.1/tcp/3" } ) ).should.not.throw();
		( () => new Nodes().add( { address: "127.0.0.1", port: 4 } ) ).should.not.throw();
		( () => new Nodes().add( Address( "/ip4/127.0.0.1/tcp/5" ) ) ).should.not.throw();
	} );

	test( "notifies on addition of another address w/ normalized address", () => {
		return new Promise( resolve => {
			const pool = new Nodes();

			pool.once( "added", resolve );

			pool.add( "/ip4/127.0.0.1/tcp/1" );
		} )
			.then( added => {
				added.should.be.instanceOf( Address.Address ).which.has.property( "id" ).which.is.equal( "/ip4/127.0.0.1/tcp/1" );
			} );
	} );

	test( "omits notification on adding address already existing in pool", () => {
		return new Promise( ( resolve, reject ) => {
			const pool = new Nodes( ["/ip4/127.0.0.1/tcp/1"] );

			pool.once( "added", () => {
				reject( new Error( "unexpected notification" ) );
			} );

			pool.add( "/ip4/127.0.0.1/tcp/1" );

			setTimeout( resolve, 100 );
		} );
	} );

	test( "omits notification on adding address of local node", () => {
		return new Promise( ( resolve, reject ) => {
			const pool = new Nodes( [], "/ip4/127.0.0.1/tcp/1" );

			pool.once( "added", () => {
				reject( new Error( "unexpected notification" ) );
			} );

			pool.add( "/ip4/127.0.0.1/tcp/1" );

			setTimeout( () => {
				pool.addresses.should.be.empty();

				resolve();
			}, 100 );
		} );
	} );

	test( "permits removal of another address after creation", () => {
		( () => new Nodes().remove( "/ip4/127.0.0.1/tcp/1" ) ).should.not.throw();
		( () => new Nodes().remove( { id: "/ip4/127.0.0.1/tcp/2" } ) ).should.not.throw();
		( () => new Nodes().remove( { address: "/ip4/127.0.0.1/tcp/3" } ) ).should.not.throw();
		( () => new Nodes().remove( { address: "127.0.0.1", port: 4 } ) ).should.not.throw();
		( () => new Nodes().remove( Address( "/ip4/127.0.0.1/tcp/5" ) ) ).should.not.throw();
	} );

	test( "notifies on removal of another address w/ normalized address", () => {
		return new Promise( resolve => {
			const pool = new Nodes( ["/ip4/127.0.0.1/tcp/1"] );

			pool.once( "removed", resolve );

			pool.remove( "/ip4/127.0.0.1/tcp/1" );
		} )
			.then( removed => {
				removed.should.be.instanceOf( Address.Address ).which.has.property( "id" ).which.is.equal( "/ip4/127.0.0.1/tcp/1" );
			} );
	} );

	test( "omits notification on removing address missing in pool", () => {
		return new Promise( ( resolve, reject ) => {
			const pool = new Nodes();

			pool.once( "removed", () => {
				reject( new Error( "unexpected notification" ) );
			} );

			pool.remove( "/ip4/127.0.0.1/tcp/1" );

			setTimeout( resolve, 100 );
		} );
	} );

	test( "omits notification on removing local address", () => {
		return new Promise( ( resolve, reject ) => {
			const pool = new Nodes( ["/ip4/127.0.0.1/tcp/1"], "/ip4/127.0.0.1/tcp/1" );

			pool.once( "removed", () => {
				reject( new Error( "unexpected notification" ) );
			} );

			pool.remove( "/ip4/127.0.0.1/tcp/1" );

			setTimeout( () => {
				pool.addresses.should.have.length( 1 );
				resolve();
			}, 100 );
		} );
	} );
} );
