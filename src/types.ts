/*
 * Signal payloads go from the clients to the server
 * Swarm payloads go from the server to the client
 */

import { AnswerPayload, CandidatePayload, OfferPayload } from '@mattkrick/fast-rtc-peer'

interface OfferSignal {
  type: 'offer'
  sdp: string
  connectionId?: string
  to?: string
}

interface InitSignal {
  type: 'init'
  sdp: string
  connectionId: string
  from: string
}

interface CandidateSignal {
  type: 'candidate'
  candidate: RTCIceCandidateInit | null
  connectionId?: string
  to?: string
}

interface AnswerSignal {
  type: 'answer'
  sdp: string
  to: string
}

export type PayloadToServer = OfferSignal | InitSignal | CandidateSignal | AnswerSignal

interface SwarmOffer extends OfferPayload {
  from: string
}

interface SwarmOfferRequest {
  type: 'offerRequest'
}

interface SwarmOfferAccepted {
  type: 'offerAccepted'
  connectionId: string
  from: string
}

interface SwarmAnswer extends AnswerPayload {
  from: string
}

interface SwarmCandidate extends CandidatePayload {
  from: string
}

export interface SwarmAccept {
  type: 'accept'
  from: string
  signals: Array<OfferPayload | CandidatePayload>
}

export type PayloadToClient =
  | SwarmAccept
  | SwarmOffer
  | SwarmOfferRequest
  | SwarmOfferAccepted
  | SwarmAnswer
  | SwarmCandidate
