![Skiff](skiff-logo.png)

# Skiff

[Raft](https://raft.github.io/) Consensus Algorithm implementation for Node.js.

[![npm version](https://badge.fury.io/js/hitchy-skiff.svg)](https://badge.fury.io/js/skiff)

* Stable: [![Build Status](https://travis-ci.org/hitchyjs/skiff.svg?branch=master)](https://travis-ci.org/hitchyjs/skiff)
* Nightly: [![Build Status](https://travis-ci.org/hitchyjs/skiff.svg?branch=develop)](https://travis-ci.org/hitchyjs/skiff)


* Persists to LevelDB (or any database exposing a [LevelDown](https://github.com/level/leveldown) interface).
* Exposes the cluster as a [Levelup](https://github.com/level/levelup#readme) or [Leveldown](https://github.com/level/leveldown#readme)-compatible interface, with which you can extend using [the Levelup plugins](https://github.com/Level/levelup/wiki/Modules#plugins).
* Encodes messages using Msgpack

## About

This package is a fork of npm package [skiff](https://www.npmjs.com/package/skiff). Due to sharing history it is using same version numbers as are used with original [skiff](https://www.npmjs.com/package/skiff).

This fork has been started to review the project's code and adopt it to fit conventions defined for [hitchy framework](http://hitchyjs.org). Even though this sounds like this fork being tightly bound to hitchy we guarantee it's not. The fork has been started to refactor parts of code, modernizing its API and adding some commands to cluster missing in original project. We basically intend to keep this project API compatible to [skiff](https://www.npmjs.com/package/skiff), too.

## Installation

```bash
$ npm install hitchy-skiff --save
```

## Usage

```javascript
const Skiff = require( 'hitchy-skiff' );

const options = {
  db: require( 'memdown' ), // in memory database
  peers: [ // peer addresses
    '/ip4/127.0.0.1/tcp/9491',
    '/ip4/127.0.0.1/tcp/9492'
  ]
};

const skiff = Skiff( '/ip4/127.0.0.1/tcp/9490', options );

// expose the cluster as a Levelup-compatible database
const db = skiff.levelup();

skiff.start( err => {
  if ( err ) {
    console.error( 'Error starting skiff node: ', err.message );
  } else {
    console.log( 'Skiff node started' );

    db.put( 'key', 'value', ( err ) => {
      // ...
    } );
  }
} );
```

# API

## Skiff (address, options)

Returns a new skiff node.

Arguments:

* `address` (string, mandatory): an address in the [multiaddr](https://github.com/multiformats/js-multiaddr#readme) format (example: `"/ip/127.0.0.1/tcp/5398"`).
* `options` (object):
  * `network` (object): if you want to share the network with other skiff nodes on the same process, create a network using `Skiff.createNetwork(options)` (see below)
  * `server` (object):
    * `port` (integer): TCP port. Defaults to the port in `address`
    * `host` (string): host name to bind the server to. Defaults to the host name in the `address`
  * rpcTimeoutMS (integer, defaults to `2000`): Timeout for RPC calls.
  * peers (array of strings, defaults to `[]`): The addresses of the peers (also in the [multiaddr](https://github.com/multiformats/js-multiaddr#readme) format). __If the database you're using is persisted to disk (which is the default), these peers will be overridden by whatever is loaded from the latest snapshot once the node starts.__
  * `levelup` (object): options to the internal Levelup database. Defaults to:

  ```json
  {
    "keyEncoding": "utf8",
    "valueEncoding": "json"
  }
  ```

  * `location` (string): Location of the base directory for the leveldb files. Defaults to the default folder of current operating system for temporary files.
  * `db` (function, defaults to [Leveldown](https://github.com/Level/leveldown#readme) implementation): Database constructor, should return a [Leveldown](https://github.com/Level/leveldown#readme) implementation.

 > (You can use this to create a in-memory database using [Memdown](https://github.com/Level/memdown#readme))

* #### Advanced options

  * `appendEntriesIntervalMS` (integer, defaults to `100`): The interval (ms) with which a leader sends `AppendEntries` messages to the followers (ping).
  * `electionTimeoutMinMS` (integer, defaults to `300`): The minimum election timeout (ms) for a node. It's the minimum time a node has to wait until no `AppendEntries` message triggers an election.
  * `electionTimeoutMaxMS` (integer, defaults to `600`): The maximum election timeout (ms) for a node. It's the maximum time a node has to wait until no `AppendEntries` message triggers an election.
  * `installSnapshotChunkSize` (integer, defaults to `10`): The maximum number of database records on each `InstallSnapshot` message.
  * `batchEntriesLimit` (integer, defaults to `10`): The maximum number of log entries in a `AppendEntries` message.
  * `clientRetryRPCTimeout` (integer, defaults to 200): The number of milliseconds the internal client has to wait until retrying
  * `clientMaxRetries` (integer, defaults to 10): The maximum number of times the client is allowed to retry the remote call.

## skiff.start (callback)

Starts the node, initializing. Calls back with no argument when started, or with error in the first argument.

## skiff.stop (callback)

Stops the node, shutting down server, disconnects from all peers and stops activity. Calls back once all this is done, or when an error is encountered, with an error in the first argument.

## skiff.levelup ()

Returns a new [Levelup-compatible](https://github.com/level/levelup) object for you to interact with the cluster.

## skiff.leveldown ()

Returns a new [Leveldown-compatible](https://github.com/level/leveldown) object for you to interact with the cluster.

## skiff.join (peerAddress, callback)

Adds a peer to the cluster. Calls back once the cluster reaches consensus, or with an error if no consensus can be reached.

## skiff.leave (peerAddress, callback)

Removes a peer from the cluster. Calls back once the cluster reaches consensus, or with an error if no consensus can be reached.

## skiff.stats ()

Returns some interesting stats for this node.

## skiff.peers (callback)

Invokes the error-first callback function with the cluster peers and some interesting stats from each.

## skiff.term ()

Returns the current term (integer).

## skiff.weaken (durationMS)

Weakens the node for the duration. During this period, the node transitions to a special `weakened` state, in which the node does not react to election timeouts. This period ends once it learns a new leader or the period runs out.

## skiff.readConsensus(callback)

Asks for read consensus from the cluster. Calls back when there is an error (with the error as the first argument) or succeeded.

The consensus is read from cluster when the majority of cluster nodes confirms consensus on current state of cluster.

## skiff.waitFor( peers, callback )

Asks for read consensus from the cluster additionally requiring confirmation from provided peers. Calls back when there is an error (with the error as the first argument) or succeeded.

This method basically works like `skiff.readConsensus()` but isn't satisfied by positive replies from majority of cluster nodes, only. It also requires positive replies from one or more peers explicitly.

```javascript
skiff.peers().then( peers => skiff.waitFor( peers ).then( () => {
	// do something
} ) );
```

This code template can be used to wait for consensus confirmed from all peer nodes of cluster.

## Events

A skiff instance emits the following events:

* `started`: once the node is started (network server is up and persisted state is loaded)
* `warning (err)`: if a non-fatal error was encountered
* `connect (peer)`: once a leader node is connected to a peer
* `disconnect (peer)`: once a leader node is disconnected from a peer
* `new state (state)`: once a node changes state (possible states are `follower`, `candidate` and `leader`)
* `leader`: once the node becomes the cluster leader
* `joined (peerAddress)`: emitted on peer joining the cluster
* `left (peerAddress)`: emitted on peer leaving the cluster
* `rpc latency (ms)`: the latency for an RPC call, in milliseconds
* `heartbeat timeout`: marks current non-leading node missing frequent request from current leader node (considering current node or leader node detached from cluster)
* `electing`: marks cluster starting leader election
* `elected (leader)`: marks cluster having elected leader
* `new leader (leader)`: marks node having changed local information on current leader on receiving message
* `up-to-date`: marks node having received snapshot from current leader to catch up with cluster

## Skiff.createNetwork (options)

Creates a network you can share amongst several Skiff nodes in the same process.

Options:

* `active` (object):
  * `inactivityTimeout` (integer, milliseconds, defaults to `5000`): The amount of time to wait before a client connection is closed because of inactivity.
* `passive` (object):
  * `server` (object):
    * `port` (integer, defaults to `9163`): the port the server should listen on
    * `host` (string, defaults to `"0.0.0.0"`): the interface address the server should listen to
    * `exclusive` (boolean, defaults to `true`): if true, the server is not shareable with other processes (see [`Server#listen()` on Node.js docs](https://nodejs.org/api/net.html#net_server_listen_options_callback)).

# Sponsors

Development of [Skiff](https://www.npmjs.com/package/skiff) is sponsored by [YLD](https://yld.io). Development of hitchy-skiff is supported by [cepharum](https://cepharum.de).

# License

[MIT](LICENSE)

# Copyright

Copyright (c) 2016 Pedro Teixeira, hitchy-skiff (c) 2017 cepharum GmbH
