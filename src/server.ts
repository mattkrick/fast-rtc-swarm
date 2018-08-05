import { INIT, OFFER_ACCEPTED, OFFER_REQUEST } from './constants'
import { OFFER, ANSWER, CANDIDATE } from '@mattkrick/fast-rtc-peer'

declare global {
  interface WebSocket {
    _uuid: WebSocketID
    _acceptedOffers: {[offerId: string]: WebSocketID}
    _offers: Array<CachedOffer>
    _requestors: Array<WebSocket>
  }
}

const sendAnswer = (ws: WebSocket, from: string, sdp: string): void => {
  ws.send(
    JSON.stringify({
      type: ANSWER,
      from,
      sdp
    })
  )
}

const sendCandidate = (ws: WebSocket, from: string, candidate: RTCIceCandidate): void => {
  if (!ws) return
  ws.send(
    JSON.stringify({
      type: CANDIDATE,
      from,
      candidate
    })
  )
}

const sendOffer = (
  ws: WebSocket,
  fromWS: WebSocket,
  offer: {id: string; candidates: Array<RTCIceCandidate>; sdp: string}
): void => {
  const { id, candidates, sdp } = offer
  const { _uuid: from } = fromWS
  fromWS.send(
    JSON.stringify({
      type: OFFER_ACCEPTED,
      id,
      from: ws._uuid
    })
  )
  fromWS._acceptedOffers[id] = ws._uuid
  ws.send(
    JSON.stringify({
      type: OFFER,
      from,
      sdp,
      candidates
    })
  )
}

const requestOffer = (ws: WebSocket): void => {
  ws.send(
    JSON.stringify({
      type: OFFER_REQUEST
    })
  )
}

type WebSocketID = string

const getClientById = (clients: Set<WebSocket>, id: WebSocketID): WebSocket | null => {
  for (const client of clients) {
    if (client._uuid === id) return client
  }
  return null
}

class CachedOffer {
  id: string
  sdp: string
  candidates: Array<RTCIceCandidate>
  isComplete: boolean

  constructor (offerId: string, sdp: string) {
    this.id = offerId
    this.sdp = sdp
    this.candidates = []
    this.isComplete = false
  }
}

interface InitPayload {
  type: 'init'
  sdp: string
  offerId: string
  from: WebSocketID
}

interface OfferPayload {
  type: 'offer'
  sdp: string
  offerId: string
}

interface CandidatePayload {
  type: 'candidate'
  candidate: RTCIceCandidate
  to?: WebSocketID
  offerId?: string
}

interface AnswerPayload {
  type: 'answer'
  sdp: string
  to: WebSocketID
}

type IncomingPayload = InitPayload | OfferPayload | CandidatePayload | AnswerPayload

const handleOnMessage = (
  clients: Set<WebSocket>,
  ws: WebSocket,
  payload: IncomingPayload
): boolean => {
  const { type } = payload
  if (payload.type === INIT) {
    const { sdp, offerId, from } = payload
    ws._uuid = from
    ws._offers = [new CachedOffer(offerId, sdp)]
    ws._requestors = []
    ws._acceptedOffers = {}
    for (const existingPeer of clients) {
      if ((existingPeer as any) === ws || existingPeer.readyState !== ws.OPEN) continue
      const offer = existingPeer._offers.pop()
      if (!offer) {
        existingPeer._requestors.push(ws)
      } else {
        sendOffer(ws, existingPeer, offer)
      }
      requestOffer(existingPeer)
    }
    return true
  }
  if (payload.type === OFFER) {
    const { sdp, offerId } = payload
    const offer = new CachedOffer(offerId, sdp)
    const requestor = ws._requestors.pop()
    if (requestor) {
      sendOffer(requestor, ws, offer)
    } else {
      ws._offers.push(offer)
    }
    return true
  } else if (payload.type === ANSWER) {
    const { sdp, to } = payload
    const client = getClientById(clients, to)
    if (client) {
      delete client._acceptedOffers[to]
      sendAnswer(client, ws._uuid, sdp)
    }
    return true
  }
  if (type === CANDIDATE) {
    const { candidate, offerId, to } = payload
    if (candidate) {
      if (offerId) {
        const offer = ws._offers.find(({ id }) => offerId === id)
        if (offer) {
          offer.candidates.push(candidate)
        } else {
          // the offer was already picked up by someone, find out who
          const to = ws._acceptedOffers[offerId]
          const client = getClientById(clients, to)
          if (client) {
            sendCandidate(client, ws._uuid, candidate)
          }
        }
      } else if (to) {
        // for re-negotiations
        const client = getClientById(clients, to)
        if (client) {
          sendCandidate(client, ws._uuid, candidate)
        }
      }
    }
    return true
  }
  return false
}

export default handleOnMessage
