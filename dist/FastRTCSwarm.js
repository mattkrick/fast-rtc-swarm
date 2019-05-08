module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/FastRTCSwarm.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/FastRTCSwarm.ts":
/*!*****************************!*\
  !*** ./src/FastRTCSwarm.ts ***!
  \*****************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "tslib");
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(tslib__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _mattkrick_fast_rtc_peer__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mattkrick/fast-rtc-peer */ "@mattkrick/fast-rtc-peer");
/* harmony import */ var _mattkrick_fast_rtc_peer__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_mattkrick_fast_rtc_peer__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var eventemitter3__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! eventemitter3 */ "eventemitter3");
/* harmony import */ var eventemitter3__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(eventemitter3__WEBPACK_IMPORTED_MODULE_2__);



class FastRTCSwarm extends eventemitter3__WEBPACK_IMPORTED_MODULE_2___default.a {
    constructor(config = {}) {
        super();
        this.peers = new Map();
        const { userId = _mattkrick_fast_rtc_peer__WEBPACK_IMPORTED_MODULE_1___default.a.generateID(), peerBuffer = 1, maxPeers = 1024, roomId = '' } = config, peerConfig = tslib__WEBPACK_IMPORTED_MODULE_0__["__rest"](config, ["userId", "peerBuffer", "maxPeers", "roomId"]);
        this.peerBuffer = peerBuffer;
        this.maxPeers = maxPeers;
        this.peerConfig = Object.assign({}, peerConfig, { streams: _mattkrick_fast_rtc_peer__WEBPACK_IMPORTED_MODULE_1___default.a.fromStreamShorthand(peerConfig.streams) });
        setTimeout(() => this.emit('signal', { type: 'init', userId, roomId }));
        for (let i = 0; i < this.peerBuffer; i++) {
            this.createOfferer();
        }
    }
    createOfferer() {
        const connectionId = _mattkrick_fast_rtc_peer__WEBPACK_IMPORTED_MODULE_1___default.a.generateID();
        const offeringPeer = this.initializePeer(Object.assign({ isOfferer: true, id: connectionId }, this.peerConfig));
        this.peers.set(connectionId, offeringPeer);
    }
    initializePeer(config) {
        const peer = new _mattkrick_fast_rtc_peer__WEBPACK_IMPORTED_MODULE_1___default.a(config);
        peer.on('signal', (signal, peer) => {
            this.emit('signal', Object.assign({}, signal, { id: peer.id }));
        });
        peer.on('open', (peer) => {
            this.emit('open', peer);
        });
        peer.on('close', (peer) => {
            this.peers.delete(peer.id);
            this.emit('close', peer);
        });
        peer.on('data', (data, peer) => {
            this.emit('data', data, peer);
        });
        peer.on('stream', (stream, name, peer) => {
            this.emit('stream', stream, name, peer);
        });
        peer.on('error', (error, peer) => {
            this.emit('error', error, peer);
        });
        peer.on('connection', (iceConnectionState, peer) => {
            this.emit('connection', iceConnectionState, peer);
        });
        return peer;
    }
    addStreams(streams) {
        const streamDict = _mattkrick_fast_rtc_peer__WEBPACK_IMPORTED_MODULE_1___default.a.fromStreamShorthand(streams);
        this.peers.forEach((peer) => {
            peer.addStreams(streamDict);
        });
        const { streams: configStreams } = this.peerConfig;
        Object.keys(streamDict).forEach((streamName) => {
            const trackDict = streamDict[streamName];
            const configTracks = configStreams[streamName];
            if (!configTracks) {
                configStreams[streamName] = trackDict;
            }
            else {
                Object.keys(trackDict).forEach((trackName) => {
                    configTracks[trackName] = trackDict[trackName];
                });
            }
        });
    }
    broadcast(message) {
        this.peers.forEach((peer) => {
            peer.send(message);
        });
    }
    close() {
        this.emit('signal', { type: 'close' });
        this.peers.forEach((peer) => peer.close());
        this.peers.clear();
    }
    dispatch(payload) {
        switch (payload.type) {
            case 'accept':
                const { id, signals, userId } = payload;
                this.peers.set(id, this.initializePeer(Object.assign({ id: id, userId }, this.peerConfig)));
                signals.forEach((signal) => {
                    this.dispatch(Object.assign({}, signal, { id }));
                });
                break;
            case 'offer':
            case 'answer':
            case 'candidate':
                const { id: peerId } = payload, desc = tslib__WEBPACK_IMPORTED_MODULE_0__["__rest"](payload, ["id"]);
                const descPeer = this.peers.get(peerId);
                if (descPeer) {
                    descPeer.dispatch(desc);
                }
                break;
            case 'offerRequest':
                this.createOfferer();
                break;
            case 'offerAccepted':
                const acceptingPeer = this.peers.get(payload.id);
                if (acceptingPeer) {
                    acceptingPeer.userId = payload.userId;
                }
                break;
            case 'leaveSwarm':
                const leavingPeer = this.peers.get(payload.id);
                leavingPeer && leavingPeer.close();
        }
    }
    muteTrack(name) {
        const { streams: configStreams } = this.peerConfig;
        Object.keys(configStreams).forEach((streamName) => {
            const trackDict = configStreams[streamName];
            Object.keys(trackDict).forEach((transceiverName) => {
                if (transceiverName !== name)
                    return;
                const entry = trackDict[transceiverName];
                if (entry && typeof entry !== 'string') {
                    entry.track.stop();
                    entry.track.enabled = false;
                }
            });
        });
        this.peers.forEach((peer) => peer.muteTrack(name));
    }
}
/* harmony default export */ __webpack_exports__["default"] = (FastRTCSwarm);


/***/ }),

/***/ "@mattkrick/fast-rtc-peer":
/*!*******************************************!*\
  !*** external "@mattkrick/fast-rtc-peer" ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("@mattkrick/fast-rtc-peer");

/***/ }),

/***/ "eventemitter3":
/*!********************************!*\
  !*** external "eventemitter3" ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("eventemitter3");

/***/ }),

/***/ "tslib":
/*!************************!*\
  !*** external "tslib" ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("tslib");

/***/ })

/******/ });
//# sourceMappingURL=FastRTCSwarm.js.map