import FastRTCPeer, { SIGNAL, DATA, DATA_OPEN, DATA_CLOSE, OFFER, ANSWER, CANDIDATE } from '@mattkrick/fast-rtc-peer'
import EventEmitter from 'eventemitter3'
import uuid from 'uuid/v4'
import { INIT, OFFER_ACCEPTED, OFFER_REQUEST } from './constants'

interface Options {
  id?: string
}

class FastRTCSwarm extends EventEmitter {
  peers: { [key: string]: FastRTCPeer } = {}
  peerOptions: RTCConfiguration
  pendingPeers: { [key: string]: FastRTCPeer } = {}
  me?: string
  isInit: boolean

  constructor(opts?: Options) {
    super()
    const { id, ...peerOptions }: Options = opts || {}
    this.me = id || uuid()
    this.peerOptions = peerOptions
    this.isInit = true
    this.createOfferer()
  }

  private createOfferer() {
    const tmpId = uuid()
    console.log("make offerer")
    const offeringPeer = new FastRTCPeer({ isOfferer: true, id: tmpId, ...this.peerOptions })
    this.peerSubscribe(offeringPeer)
    this.pendingPeers[tmpId] = offeringPeer
  }

  private peerSubscribe(peer) {
    peer.on(SIGNAL, this.onPeerSignal)
    peer.on(DATA_OPEN, this.onPeerDataOpen)
    peer.on(DATA_CLOSE, this.onPeerDataClose)
    peer.on(DATA, this.onPeerData)
  }

  private onPeerData = (data, peer) => {
    this.emit(DATA, data, peer)
  }

  private onPeerDataClose = (peer) => {
    this.emit(DATA_CLOSE, peer)
  }

  private onPeerDataOpen = (peer) => {
    this.emit(DATA_OPEN, peer)
  }

  private onPeerSignal = (signal, peer) => {
    const { type } = signal
    const { id } = peer
    switch (type) {
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

  broadcast(message: string) {
    const peerIds = Object.keys(this.peers)
    for (let ii = 0; ii < peerIds.length; ii++) {
      const peerId = peerIds[ii]
      const peer = this.peers[peerId]
      peer.send(message)
    }
  }

  close() {
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

  dispatch(payload) {
    const { id, candidate, candidates = [], from: peerId, sdp, type } = payload
    const peer = this.peers[peerId]
    switch (type) {
      case OFFER:
        const answeringPeer = new FastRTCPeer({ id: peerId, ...this.peerOptions })
        this.peerSubscribe(answeringPeer)
        answeringPeer.dispatch({ type, sdp })
        candidates.forEach((candidate) => {
          answeringPeer.dispatch({ type: CANDIDATE, candidate })
        })
        break
      case OFFER_REQUEST:
        this.createOfferer()
        break
      case OFFER_ACCEPTED:
        this.peers[peerId] = this.pendingPeers[id]
        delete this.pendingPeers[id]
        break
      case ANSWER:
        peer.dispatch({ type, sdp })
        break
      case CANDIDATE:
        peer.dispatch({ type, candidate })
    }
  }
}

export default FastRTCSwarm
