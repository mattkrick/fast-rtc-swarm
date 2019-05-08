import FastRTCPeer, { AnswerPayload, CandidatePayload, DataPayload, OfferPayload, PeerConfig, StreamDict, StreamDictInput } from '@mattkrick/fast-rtc-peer';
import EventEmitter from 'eventemitter3';
import StrictEventEmitter from 'strict-event-emitter-types';
declare type Swarm<T> = T & {
    id: string;
};
export interface InitPayloadToServer {
    readonly type: 'init';
    readonly userId: string;
    readonly roomId: string | number;
}
export interface ClosePayloadToServer {
    readonly type: 'close';
}
export declare type CandidatePayloadToServer = Swarm<CandidatePayload>;
export declare type AnswerPayloadToServer = Swarm<AnswerPayload>;
export declare type OfferPayloadToServer = Swarm<OfferPayload>;
export declare type PayloadToServer = CandidatePayloadToServer | AnswerPayloadToServer | OfferPayloadToServer | InitPayloadToServer | ClosePayloadToServer;
interface SwarmOfferRequest {
    readonly type: 'offerRequest';
}
interface SwarmOfferAccepted {
    readonly type: 'offerAccepted';
    readonly id: string;
    readonly userId: string;
}
export interface SwarmAccept {
    readonly type: 'accept';
    readonly id: string;
    readonly userId: string;
    readonly signals: Array<OfferPayload | CandidatePayload>;
}
export interface SwarmLeave {
    readonly type: 'leaveSwarm';
    readonly id: string;
}
export declare type PayloadToClient = SwarmAccept | SwarmOfferRequest | SwarmOfferAccepted | CandidatePayloadToServer | AnswerPayloadToServer | OfferPayloadToServer | SwarmLeave;
export interface FastRTCSwarmEvents {
    signal: (payload: PayloadToServer) => void;
    data: (data: DataPayload, peer: FastRTCPeer) => void;
    open: (peer: FastRTCPeer) => void;
    close: (peer: FastRTCPeer) => void;
    error: (error: Error, peer?: FastRTCPeer) => void;
    stream: (stream: MediaStream, name: string, peer: FastRTCPeer) => void;
    connection: (iceConnectionState: RTCIceConnectionState, peer: FastRTCPeer) => void;
}
export declare type FastRTCSwarmEmitter = {
    new (): StrictEventEmitter<EventEmitter, FastRTCSwarmEvents>;
};
export interface SwarmConfig extends PeerConfig {
    peerBuffer?: number;
    maxPeers?: number;
    roomId?: string | number;
}
declare const FastRTCSwarm_base: FastRTCSwarmEmitter;
declare class FastRTCSwarm extends FastRTCSwarm_base {
    peers: Map<string, FastRTCPeer>;
    peerConfig: PeerConfig & {
        streams: StreamDict;
    };
    peerBuffer: number;
    maxPeers: number;
    constructor(config?: SwarmConfig);
    private createOfferer;
    private initializePeer;
    addStreams(streams: StreamDictInput): void;
    broadcast(message: DataPayload): void;
    close(): void;
    dispatch(payload: PayloadToClient): void;
    muteTrack(name: string): void;
}
export default FastRTCSwarm;
//# sourceMappingURL=FastRTCSwarm.d.ts.map