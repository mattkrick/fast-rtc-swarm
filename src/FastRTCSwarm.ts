import FastRTCPeer, {
  AnswerPayload,
  CandidatePayload,
  DataPayload,
  OfferPayload,
  PayloadToServer as PayloadToSwarm,
  PeerConfig,
  StreamDict,
  StreamDictInput
} from '@mattkrick/fast-rtc-peer'
import EventEmitter from 'eventemitter3'
import StrictEventEmitter from 'strict-event-emitter-types'

type Swarm<T> = T & {id: string}

export interface InitPayloadToServer {
  readonly type: 'init'
  readonly userId: string
  readonly roomId: string | number
}

export interface ClosePayloadToServer {
  readonly type: 'close'
}

export type CandidatePayloadToServer = Swarm<CandidatePayload>
export type AnswerPayloadToServer = Swarm<AnswerPayload>
export type OfferPayloadToServer = Swarm<OfferPayload>
export type PayloadToServer =
  | CandidatePayloadToServer
  | AnswerPayloadToServer
  | OfferPayloadToServer
  | InitPayloadToServer
  | ClosePayloadToServer

interface SwarmOfferRequest {
  readonly type: 'offerRequest'
}

interface SwarmOfferAccepted {
  readonly type: 'offerAccepted'
  readonly id: string
  readonly userId: string
}

export interface SwarmAccept {
  readonly type: 'accept'
  readonly id: string
  readonly userId: string
  readonly signals: Array<OfferPayload | CandidatePayload>
}

export interface SwarmLeave {
  readonly type: 'leaveSwarm'
  readonly id: string
}

export type PayloadToClient =
  | SwarmAccept
  | SwarmOfferRequest
  | SwarmOfferAccepted
  | CandidatePayloadToServer
  | AnswerPayloadToServer
  | OfferPayloadToServer
  | SwarmLeave

export interface FastRTCSwarmEvents {
  signal: (payload: PayloadToServer) => void
  data: (data: DataPayload, peer: FastRTCPeer) => void
  open: (peer: FastRTCPeer) => void
  close: (peer: FastRTCPeer) => void
  error: (error: Error, peer?: FastRTCPeer) => void
  stream: (stream: MediaStream, name: string, peer: FastRTCPeer) => void
  connection: (iceConnectionState: RTCIceConnectionState, peer: FastRTCPeer) => void
}

export type FastRTCSwarmEmitter = {new (): StrictEventEmitter<EventEmitter, FastRTCSwarmEvents>}

export interface SwarmConfig extends PeerConfig {
  peerBuffer?: number
  maxPeers?: number
  roomId?: string | number
}

type ConnectionId = string

class FastRTCSwarm extends (EventEmitter as FastRTCSwarmEmitter) {
  peers = new Map<ConnectionId, FastRTCPeer>()
  peerConfig: PeerConfig & {streams: StreamDict}
  peerBuffer: number
  maxPeers: number

  constructor (config: SwarmConfig = {}) {
    super()
    const {
      userId = FastRTCPeer.generateID(),
      peerBuffer = 1,
      maxPeers = 1024,
      roomId = '',
      ...peerConfig
    } = config
    this.peerBuffer = peerBuffer
    this.maxPeers = maxPeers
    this.peerConfig = { ...peerConfig, streams: FastRTCPeer.fromStreamShorthand(peerConfig.streams) }
    // wait a tick to allow devs to set up their event listeners
    setTimeout(() => this.emit('signal', { type: 'init', userId, roomId }))
    for (let i = 0; i < this.peerBuffer; i++) {
      this.createOfferer()
    }
  }

  private createOfferer () {
    const connectionId = FastRTCPeer.generateID()
    const offeringPeer = this.initializePeer({
      isOfferer: true,
      id: connectionId,
      ...this.peerConfig
    })
    this.peers.set(connectionId, offeringPeer)
  }

  private initializePeer (config: PeerConfig) {
    const peer = new FastRTCPeer(config)
    peer.on('signal', (signal: PayloadToSwarm, peer: FastRTCPeer) => {
      this.emit('signal', { ...signal, id: peer.id } as PayloadToServer)
    })
    peer.on('open', (peer: FastRTCPeer) => {
      this.emit('open', peer)
    })
    peer.on('close', (peer: FastRTCPeer) => {
      this.peers.delete(peer.id)
      this.emit('close', peer)
    })
    peer.on('data', (data: DataPayload, peer: FastRTCPeer) => {
      this.emit('data', data, peer)
    })
    peer.on('stream', (stream: MediaStream, name: string, peer: FastRTCPeer) => {
      this.emit('stream', stream, name, peer)
    })
    peer.on('error', (error: Error, peer: FastRTCPeer) => {
      this.emit('error', error, peer)
    })
    peer.on('connection', (iceConnectionState: RTCIceConnectionState, peer: FastRTCPeer) => {
      this.emit('connection', iceConnectionState, peer)
    })
    return peer
  }

  addStreams (streams: StreamDictInput) {
    const streamDict = FastRTCPeer.fromStreamShorthand(streams)
    this.peers.forEach((peer) => {
      peer.addStreams(streamDict)
    })

    // update peerConfig so new peers get what the current ones are getting
    const { streams: configStreams } = this.peerConfig
    Object.keys(streamDict).forEach((streamName) => {
      const trackDict = streamDict[streamName]
      const configTracks = configStreams[streamName]
      if (!configTracks) {
        configStreams[streamName] = trackDict
      } else {
        Object.keys(trackDict).forEach((trackName) => {
          configTracks[trackName] = trackDict[trackName]
        })
      }
    })
  }

  broadcast (message: DataPayload) {
    this.peers.forEach((peer) => {
      peer.send(message)
    })
  }

  close (): void {
    this.emit('signal', { type: 'close' })
    this.peers.forEach((peer) => peer.close())
    this.peers.clear()
  }

  dispatch (payload: PayloadToClient): void {
    switch (payload.type) {
      case 'accept':
        const { id, signals, userId } = payload
        this.peers.set(id, this.initializePeer({ id: id, userId, ...this.peerConfig }))
        signals.forEach((signal) => {
          this.dispatch({ ...signal, id })
        })
        break
      case 'offer':
      case 'answer':
      case 'candidate':
        const { id: peerId, ...desc } = payload
        const descPeer = this.peers.get(peerId)
        if (descPeer) {
          descPeer.dispatch(desc as any)
        }
        break
      case 'offerRequest':
        this.createOfferer()
        break
      case 'offerAccepted':
        const acceptingPeer = this.peers.get(payload.id)
        if (acceptingPeer) {
          acceptingPeer.userId = payload.userId
        }
        break
      case 'leaveSwarm':
        const leavingPeer = this.peers.get(payload.id)
        leavingPeer && leavingPeer.close()
    }
  }

  muteTrack (name: string) {
    // remove from config so new peers don't get the video
    const { streams: configStreams } = this.peerConfig
    Object.keys(configStreams).forEach((streamName) => {
      const trackDict = configStreams[streamName]
      Object.keys(trackDict).forEach((transceiverName) => {
        if (transceiverName !== name) return
        const entry = trackDict[transceiverName]
        if (entry && typeof entry !== 'string') {
          entry.track.stop()
          // tell the hardware to turn off the light
          entry.track.enabled = false
        }
      })
    })

    this.peers.forEach((peer) => peer.muteTrack(name))
  }
}

export default FastRTCSwarm
