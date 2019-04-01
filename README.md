# fast-rtc-swarm

A full-mesh WebRTC swarm built on top of WebSockets & fast-rtc-peer

## Installation

`yarn add @mattkrick/fast-rtc-swarm`

## What is it

[fast-rtc-peer](https://github.com/mattkrick/fast-rtc-peer) offers a great API to connect 2 peers.
If you'd like to connect more than 2 peers, you're on your own.
That's why this exists.
It uses a full mesh (vs. partial mesh) network so every client is connected to every other client.
A full mesh is great for up to ~100 connections.
After that, you'll probably want to move to a partial mesh & trade a little latency for memory.

## How's it different from webrtc-swarm?

fast-rtc-swarm is different.
- It's built on fast-rtc-peer, which is built on the new WebRTC v1.0 spec (transceivers instead of stage 2 tracks or stage 1 streams)
- The signaling server doesn't have to be server sent events. It can be anything. (see [reference implementation](https://github.com/ParabolInc/action/tree/834d6f06fbcca8f8026a97e2872b44806c0fb6b8/src/server/wrtc/signalServer))
- It doesn't bother the signaling server with a heartbeat. We can derive that info from the swarm by listening to `disconnected` on each peer. 
If timeouts are an issue, then add a WebSocket#ping on your server. Don't make the client do more work than necessary!
- It only connects to 1 signaling server. Multiple servers is a proxy problem. Again, don't make the client work hard!
- No unauthenticated-by-default signaling server CLI. I'm not gonna make it easier for you to write an insecure server :-)
- No multiplexing streams. If you need a new data channel, open another one natively, not with expensive (and LARGE) stream packages.
- It uses the fast-rtc protocol for the fastest connection possible

## What makes it so fast?

The fast-rtc protocol completes a WebRTC handshake in only 2 round trips. 
Other implementations take 3 (or even 4!)
It does this by keeping a `peerBuffer` of offers and candidates.
Think of it like "pay-it-forward". 
You buy the person behind you a coffee, so they get a free coffee when they get to register & buy the person behind them a coffee.

Here's how it works:

Alice is the first peer to join the swarm:
- She gives the server an OFFER that can be used by the next person to join
- As CANDIDATES and additional OFFERS trickle in, she forwards them to the server
- The server groups CANDIDATES and OFFERS in a single CHUNK, awaiting an ACCEPT
- When someone ACCEPTS her CHUNK, the server REQUESTS another from her
- As CANDIDATES and OFFERS continue to trickle in, they are forwarded to client that ACCEPTED the original chunk

When Bob joins the swarm:
- He follows the same procedure as Alice
- He takes one CHUNK from each client on the server
- If Alice does not have a CHUNK readily available, Bob puts his name on her waiting list
- On the client, Bob creates an ANSWER to each OFFER and forwards it to the signaling server
- The signaling server forwards Bob's ANSWER to Alice
- Alice uses Bob's ANSWER to initiate the connection

That's it! See [reference implementation](https://github.com/ParabolInc/action/tree/834d6f06fbcca8f8026a97e2872b44806c0fb6b8/src/server/wrtc/signalServer) and the example below to see how to add it to your own server.


## Usage

```js
// client
import FastRTCSwarm from '@mattkrick/fast-rtc-swarm'

const socket = new WebSocket('ws://localhost:3000');
socket.addEventListener('open', () => {
  const swarm = new FastRTCSwarm()
  // send the signal to the signaling server
  swarm.on('signal', (signal) => {
    socket.send(JSON.stringify(signal))
  })
  // when the signal come back, dispatch it to the swarm
  socket.addEventListener('message', (event) => {
    const payload = JSON.parse(event.data)
    swarm.dispatch(payload)
  })
  // when the connection is open, say hi to your new peer
  swarm.on('dataOpen', (peer) => {
    console.log('data channel open!')
    peer.send('hi')
  })
  // when your peer says hi, log it
  swarm.on('data', (data, peer) => {
    console.log('data received', data, peer)
  })
})
```

## API

Config: A superset of fast-rtc-peer's config.
To add a TURN server to the default list of ICE candidates, see [fast-rtc-peer](https://github.com/mattkrick/fast-rtc-peer). 
- `roomId`: a string to define the room all the peers are joining
- `peerBuffer`: the number of additional offers to keep on the server (default 0)

Methods on FastRTCSwarm
- `addStreams(streamDict)`: similar to fast-rtc-peer's `addStreams`, but updates your tracks for future peers
- `broadcast(message)`: send a string or buffer to all connected peers
- `close()`: destroy all peer connections
- `dispatch(signal)`: receive an incoming signal from the signal server
- `muteTrack(trackName)`: mute's the track for all peers & future peers

## Events

- `swarm.on('open', (peer) => {})`: fired when a peer connects
- `swarm.on('close', (peer) => {})`: fired when a peer disconnects
- `swarm.on('data', (data, peer) => {})`: fired when a peer sends data
- `swarm.on('signal', (signal, peer) => {})`: fired when a peer creates an offer, ICE candidate, or answer. 
- `swarm.on('stream', (stream, peer) => {})`: fired when a peer creates or updates an audio/video track.
- `swarm.on('error', (error, peer) => {})`: fired when a peer has a signaling error.
- `swarm.on('connection', (stream, peer) => {})`: fired when a peer's ICE connection state changes

## License

MIT
