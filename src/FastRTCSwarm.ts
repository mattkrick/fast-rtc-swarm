import FastRTCPeer, {
  DispatchPayload,
  DataPayload,
  SIGNAL,
  DATA,
  DATA_OPEN,
  DATA_CLOSE,
  OFFER,
  ANSWER,
  CANDIDATE,
  OfferPayload,
  AnswerPayload,
  CandidatePayload
} from '@mattkrick/fast-rtc-peer'

import EventEmitter from 'eventemitter3'
import uuid from 'uuid/v4'
import { INIT, OFFER_ACCEPTED, OFFER_REQUEST } from './constants'

interface Options {
  id?: string
}

interface SwarmOfferPayload extends OfferPayload {
  from: string
  candidates: Array<RTCIceCandidateInit>
}

interface SwarmOfferRequest {
  type: 'offerRequest'
}

interface SwarmOfferAccepted {
  type: 'offerAccepted'
  id: string
  from: string
}

interface SwarmAnswer extends AnswerPayload {
  from: string
}

interface SwarmCandidate extends CandidatePayload {
  from: string
}

export type SwarmPayload =
  | SwarmOfferPayload
  | SwarmOfferRequest
  | SwarmOfferAccepted
  | SwarmAnswer
  | SwarmCandidate

class FastRTCSwarm extends EventEmitter {
  peers: {[key: string]: FastRTCPeer} = {}
  peerOptions: RTCConfiguration
  pendingPeers: {[key: string]: FastRTCPeer} = {}
  me?: string
  isInit: boolean

  constructor (opts?: Options) {
    super()
    const { id, ...peerOptions }: Options = opts || {}
    this.me = id || uuid()
    this.peerOptions = peerOptions
    this.isInit = true
    this.createOfferer()
  }

  private createOfferer () {
    const tmpId = uuid()
    const offeringPeer = new FastRTCPeer({ isOfferer: true, id: tmpId, ...this.peerOptions })
    this.peerSubscribe(offeringPeer)
    this.pendingPeers[tmpId] = offeringPeer
  }

  private peerSubscribe (peer: FastRTCPeer) {
    peer.on(SIGNAL, this.onPeerSignal)
    peer.on(DATA_OPEN, this.onPeerDataOpen)
    peer.on(DATA_CLOSE, this.onPeerDataClose)
    peer.on(DATA, this.onPeerData)
  }

  private onPeerData = (data: DataPayload, peer: FastRTCPeer) => {
    this.emit(DATA, data, peer)
  }

  private onPeerDataClose = (peer: FastRTCPeer) => {
    delete this.peers[peer.id]
    this.emit(DATA_CLOSE, peer)
  }

  private onPeerDataOpen = (peer: FastRTCPeer) => {
    this.emit(DATA_OPEN, peer)
  }

  private onPeerSignal = (signal: DispatchPayload, peer: FastRTCPeer) => {
    const { id } = peer
    switch (signal.type) {
      case OFFER:
        if (this.isInit) {
          this.isInit = false
          this.emit(SIGNAL, { type: INIT, sdp: signal.sdp, offerId: id, from: this.me })
        } else {
          this.emit(SIGNAL, { type: OFFER, sdp: signal.sdp, offerId: id })
        }
        break
      case CANDIDATE:
        if (this.pendingPeers[id]) {
          this.emit(SIGNAL, { type: CANDIDATE, candidate: signal.candidate, offerId: id })
        } else {
          this.emit(SIGNAL, { type: CANDIDATE, candidate: signal.candidate, to: id })
        }
        break
      case ANSWER:
        this.emit(SIGNAL, { type: ANSWER, sdp: signal.sdp, to: id })
    }
  }

  broadcast (message: DataPayload) {
    const peerIds = Object.keys(this.peers)
    for (let ii = 0; ii < peerIds.length; ii++) {
      const peerId = peerIds[ii]
      const peer = this.peers[peerId]
      peer.send(message)
    }
  }

  close () {
    const peerIds = Object.keys(this.peers)
    for (let ii = 0; ii < peerIds.length; ii++) {
      const peerId = peerIds[ii]
      const peer = this.peers[peerId]
      peer.close()
    }
    const pendingPeerIds = Object.keys(this.pendingPeers)
    for (let ii = 0; ii < pendingPeerIds.length; ii++) {
      const pendingPeerId = pendingPeerIds[ii]
      const pendingPeer = this.pendingPeers[pendingPeerId]
      pendingPeer.close()
    }
    this.peers = {}
    this.pendingPeers = {}
  }

  dispatch (payload: SwarmPayload) {
    switch (payload.type) {
      case OFFER:
        const { candidates, type, sdp } = payload
        const answeringPeer = new FastRTCPeer({ id: payload.from, ...this.peerOptions })
        this.peerSubscribe(answeringPeer)
        answeringPeer.dispatch({ type, sdp })
        candidates.forEach((candidate) => {
          answeringPeer.dispatch({ type: CANDIDATE, candidate })
        })
        this.peers[payload.from] = answeringPeer
        break
      case OFFER_REQUEST:
        this.createOfferer()
        break
      case OFFER_ACCEPTED:
        const { id } = payload
        const persistedPeer = this.pendingPeers[id]
        persistedPeer.id = payload.from
        this.peers[payload.from] = persistedPeer
        delete this.pendingPeers[id]
        break
      case ANSWER:
        this.peers[payload.from].dispatch({ type: payload.type, sdp: payload.sdp })
        break
      case CANDIDATE:
        this.peers[payload.from].dispatch({ type: payload.type, candidate: payload.candidate })
    }
  }
}

export default FastRTCSwarm
