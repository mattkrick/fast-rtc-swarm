import FastRTCPeer, {
  AnswerPayload,
  DataPayload,
  OfferPayload,
  PayloadToServer as PayloadToSwarm,
  PeerConfig
} from '@mattkrick/fast-rtc-peer'
import EventEmitter from 'eventemitter3'
import StrictEventEmitter from 'strict-event-emitter-types'
import { PayloadToClient, PayloadToServer } from './types'

interface FastRTCSwarmEvents {
  signal: (payload: PayloadToServer) => void
  data: (data: DataPayload, peer: FastRTCPeer) => void
  dataOpen: (peer: FastRTCPeer) => void
  dataClose: (peer: FastRTCPeer) => void
  error: (error: Error, peer: FastRTCPeer) => void
  stream: (stream: MediaStream | null, peer: FastRTCPeer) => void
}

export type FastRTCSwarmEmitter = {new (): StrictEventEmitter<EventEmitter, FastRTCSwarmEvents>}

interface Options extends RTCConfiguration {
  id?: string
}

class FastRTCSwarm extends (EventEmitter as FastRTCSwarmEmitter) {
  peers: {[key: string]: FastRTCPeer} = {}
  peerOptions: RTCConfiguration
  pendingPeers: {[key: string]: FastRTCPeer} = {}
  me?: string
  isInit: boolean

  constructor (opts?: Options) {
    super()
    const { id, ...peerOptions }: Options = opts || {}
    this.me = id || FastRTCPeer.generateID()
    this.peerOptions = peerOptions
    this.isInit = true
    this.createOfferer()
  }

  private createOfferer (): void {
    const connectionId = FastRTCPeer.generateID()
    const offeringPeer = this.initializePeer({
      isOfferer: true,
      id: connectionId,
      ...this.peerOptions
    })
    this.pendingPeers[connectionId] = offeringPeer
  }

  private initializePeer (config: PeerConfig) {
    const peer = new FastRTCPeer(config)
    peer.on('signal', this.onPeerSignal)
    peer.on('dataOpen', this.onPeerDataOpen)
    peer.on('dataClose', this.onPeerDataClose)
    peer.on('data', this.onPeerData)
    peer.on('stream', this.onPeerStream)
    return peer
  }

  private onPeerData = (data: DataPayload, peer: FastRTCPeer): void => {
    this.emit('data', data, peer)
  }

  private onPeerDataClose = (peer: FastRTCPeer): void => {
    delete this.peers[peer.id]
    this.emit('dataClose', peer)
  }

  private onPeerDataOpen = (peer: FastRTCPeer): void => {
    this.emit('dataOpen', peer)
  }

  private onPeerStream = (stream: MediaStream | null, peer: FastRTCPeer) => {
    this.emit('stream', stream, peer)
  }

  private onPeerSignal = (signal: PayloadToSwarm, peer: FastRTCPeer): void => {
    const { id } = peer
    const field = this.peers[id] ? 'to' : 'connectionId'
    switch (signal.type) {
      case 'offer':
        if (this.isInit) {
          this.isInit = false
          this.emit('signal', { type: 'init', sdp: signal.sdp!, connectionId: id, from: this.me! })
        } else {
          this.emit('signal', { type: 'offer', sdp: signal.sdp!, [field]: id })
        }
        break
      case 'candidate':
        this.emit('signal', { type: 'candidate', candidate: signal.candidate, [field]: id })
        break
      case 'answer':
        this.emit('signal', { type: 'answer', sdp: signal.sdp!, to: id })
    }
  }

  broadcast (message: DataPayload): void {
    const peerIds = Object.keys(this.peers)
    for (let ii = 0; ii < peerIds.length; ii++) {
      const peerId = peerIds[ii]
      const peer = this.peers[peerId]
      peer.send(message)
    }
  }

  close (): void {
    const peerIds = Object.keys(this.peers)
    for (let ii = 0; ii < peerIds.length; ii++) {
      const peerId = peerIds[ii]
      const peer = this.peers[peerId]
      peer.close()
    }
    const connectionIds = Object.keys(this.pendingPeers)
    for (let ii = 0; ii < connectionIds.length; ii++) {
      const connectionId = connectionIds[ii]
      const pendingPeer = this.pendingPeers[connectionId]
      pendingPeer.close()
    }
    this.peers = {}
    this.pendingPeers = {}
  }

  dispatch (payload: PayloadToClient): void {
    switch (payload.type) {
      case 'accept':
        const { signals } = payload
        this.peers[payload.from] = this.initializePeer({ id: payload.from, ...this.peerOptions })
        signals.forEach((signal) => {
          this.dispatch({ ...signal, from: payload.from })
        })
        break
      case 'offer':
      case 'answer':
        const { type, sdp } = payload
        const peer = this.peers[payload.from]
        peer.dispatch({ type, sdp } as OfferPayload | AnswerPayload)
        break
      case 'offerRequest':
        this.createOfferer()
        break
      case 'offerAccepted':
        const { connectionId } = payload
        const persistedPeer = this.pendingPeers[connectionId]
        persistedPeer.id = payload.from
        this.peers[payload.from] = persistedPeer
        delete this.pendingPeers[connectionId]
        break
      case 'candidate':
        this.peers[payload.from].dispatch({ type: payload.type, candidate: payload.candidate })
    }
  }
}

export default FastRTCSwarm
