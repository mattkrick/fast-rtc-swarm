import { CandidatePayload, OfferPayload } from '@mattkrick/fast-rtc-peer'
import { PayloadToClient, PayloadToServer } from './types'

declare global {
  interface WebSocket {
    _uuid: WebSocketID
    _acceptedOffers: {[connectionId: string]: WebSocketID}
    _connectionChunks: Array<ConnectionChunk>
    _requestors: Array<WebSocket>
    _ready: boolean
  }
}

class ConnectionChunk {
  id: string
  signals: Array<OfferPayload | CandidatePayload>

  constructor (connectionId: string, sdp: string) {
    this.id = connectionId
    this.signals = [
      {
        type: 'offer',
        sdp
      }
    ]
  }
}

type Authorize = (from: WebSocket, to: WebSocket) => boolean
const defaultAuthorize = () => true
const sendPayload = (ws: WebSocket | undefined | null, payload: PayloadToClient) => {
  if (!ws) return
  ws.send(JSON.stringify(payload))
}

const sendChunk = (ws: WebSocket, fromWS: WebSocket, connectionChunk: ConnectionChunk): void => {
  const { id, signals } = connectionChunk
  const { _uuid: from } = fromWS
  sendPayload(ws, {
    type: 'accept',
    signals,
    from
  })
  sendPayload(fromWS, { type: 'offerAccepted', connectionId: id, from: ws._uuid })
  // TODO GC acceptedOffers periodically here
  fromWS._acceptedOffers[id] = ws._uuid
}

type WebSocketID = string

const getClientById = (clients: Array<WebSocket>, id: WebSocketID): WebSocket | null => {
  let foundClient: WebSocket | null = null
  clients.forEach((client) => {
    if (!foundClient && client._uuid === id) {
      foundClient = client
    }
  })
  return foundClient
}

const handleWRTCSignal = (
  clients: Array<WebSocket>,
  ws: WebSocket,
  payload: PayloadToServer,
  authorize: Authorize = defaultAuthorize
): boolean => {
  const { type } = payload

  if (payload.type === 'init') {
    const { sdp, connectionId, from } = payload
    // validate `from` is unique
    const existingClient = getClientById(clients, from)
    if (existingClient) return true
    ws._uuid = from
    ws._connectionChunks = [new ConnectionChunk(connectionId, sdp)]
    ws._requestors = []
    ws._acceptedOffers = {}
    ws._ready = true
    clients.forEach((existingPeer) => {
      if (existingPeer === ws || !existingPeer._ready || !authorize(ws, existingPeer)) return
      const connectionChunk = existingPeer._connectionChunks.pop()
      if (!connectionChunk) {
        existingPeer._requestors.push(ws)
      } else {
        sendChunk(ws, existingPeer, connectionChunk)
      }
      sendPayload(existingPeer, { type: 'offerRequest' })
    })
    return true
  }

  if (payload.type === 'offer') {
    const { connectionId, sdp, to } = payload
    if (to) {
      const client = getClientById(clients, to)
      if (!client || !authorize(ws, client)) return true
      sendPayload(client, { type: 'offer', from: ws._uuid, sdp })
    } else if (connectionId) {
      const existingChunk = ws._connectionChunks.find(
        (connectionChunk) => connectionChunk.id === connectionId
      )
      if (existingChunk) {
        // the offer is just a piece of a larger connectionChunk
        existingChunk.signals.push({ type: 'offer', sdp })
      } else {
        const connectionChunk = new ConnectionChunk(connectionId, sdp)
        const requestor = ws._requestors.pop()
        if (requestor) {
          // the offer is part of backlogged connectionChunk
          sendChunk(requestor, ws, connectionChunk)
        } else {
          // the offer is eagerly supplied for the next visitor
          ws._connectionChunks.push(connectionChunk)
        }
      }
    }
    return true
  }

  if (payload.type === 'answer') {
    const { sdp, to } = payload
    const client = getClientById(clients, to)
    if (!client || !authorize(ws, client)) return true
    sendPayload(client, { type: 'answer', from: ws._uuid, sdp })
    return true
  }

  if (type === 'candidate') {
    const { candidate, connectionId, to } = payload
    if (candidate) {
      if (connectionId) {
        const existingChunk = ws._connectionChunks.find(({ id }) => connectionId === id)
        if (existingChunk) {
          existingChunk.signals.push({ type: 'candidate', candidate })
        } else {
          // the offer was already picked up by someone, find out who
          const to = ws._acceptedOffers[connectionId]
          const client = getClientById(clients, to)
          if (!client || !authorize(ws, client)) return true
          sendPayload(client, { type: 'candidate', from: ws._uuid, candidate })
        }
      } else if (to) {
        // for re-negotiations
        const client = getClientById(clients, to)
        if (!client || !authorize(ws, client)) return true
        sendPayload(client, { type: 'candidate', from: ws._uuid, candidate })
      }
    }
    return true
  }

  return false
}

export default handleWRTCSignal
