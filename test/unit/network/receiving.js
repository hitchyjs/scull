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
require( "should" );

const { ReceivingNetwork } = require( "../../../lib/network/index" );

const MY_ADDRESS = "/ip4/127.0.0.1/tcp/8080/what/ever";


suite( "A receiving network", () => {
	test( "is available", () => {
		( ReceivingNetwork != null ).should.be.true();
	} );

	test( "throw when created w/o provision of local address for listening", () => {
		( () => new ReceivingNetwork() ).should.throw();
	} );

	test( "can be created w/ local node's address required for listening", () => {
		const network = new ReceivingNetwork( MY_ADDRESS );
		network.end();

		return new Promise( resolve => network.once( "close", resolve ) );
	} );

	test( "exposes writable stream", () => {
		const network = new ReceivingNetwork( MY_ADDRESS );

		network.should.be.instanceOf( require( "stream" ).Writable );

		network.end();

		return new Promise( resolve => network.once( "close", resolve ) );
	} );
} );
