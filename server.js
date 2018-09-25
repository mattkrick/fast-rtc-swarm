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
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/server.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/server.ts":
/*!***********************!*\
  !*** ./src/server.ts ***!
  \***********************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
class ConnectionChunk {
    constructor(connectionId, sdp) {
        this.id = connectionId;
        this.signals = [{
                type: 'offer',
                sdp
            }];
    }
}
const defaultAuthorize = () => true;
const sendPayload = (ws, payload) => {
    if (!ws)
        return;
    ws.send(JSON.stringify(payload));
};
const sendChunk = (ws, fromWS, connectionChunk) => {
    const { id, signals } = connectionChunk;
    const { _uuid: from } = fromWS;
    sendPayload(ws, {
        type: 'accept',
        signals,
        from
    });
    sendPayload(fromWS, { type: 'offerAccepted', connectionId: id, from: ws._uuid });
    fromWS._acceptedOffers[id] = ws._uuid;
};
const getClientById = (clients, id) => {
    let foundClient = null;
    clients.forEach((client) => {
        if (!foundClient && client._uuid === id) {
            foundClient = client;
        }
    });
    return foundClient;
};
const handleWRTCSignal = (clients, ws, payload, authorize = defaultAuthorize) => {
    const { type } = payload;
    if (payload.type === 'init') {
        const { sdp, connectionId, from } = payload;
        const existingClient = getClientById(clients, from);
        if (existingClient)
            return true;
        ws._uuid = from;
        ws._connectionChunks = [new ConnectionChunk(connectionId, sdp)];
        ws._requestors = [];
        ws._acceptedOffers = {};
        ws._ready = true;
        clients.forEach((existingPeer) => {
            if (existingPeer === ws || !existingPeer._ready || !authorize(ws, existingPeer))
                return;
            const connectionChunk = existingPeer._connectionChunks.pop();
            if (!connectionChunk) {
                existingPeer._requestors.push(ws);
            }
            else {
                sendChunk(ws, existingPeer, connectionChunk);
            }
            sendPayload(existingPeer, { type: 'offerRequest' });
        });
        return true;
    }
    if (payload.type === 'offer') {
        const { connectionId, sdp, to } = payload;
        if (to) {
            const client = getClientById(clients, to);
            if (!client || !authorize(ws, client))
                return true;
            sendPayload(client, { type: 'offer', from: ws._uuid, sdp });
        }
        else if (connectionId) {
            const existingChunk = ws._connectionChunks.find((connectionChunk) => connectionChunk.id === connectionId);
            if (existingChunk) {
                existingChunk.signals.push({ type: 'offer', sdp });
            }
            else {
                const connectionChunk = new ConnectionChunk(connectionId, sdp);
                const requestor = ws._requestors.pop();
                if (requestor) {
                    sendChunk(requestor, ws, connectionChunk);
                }
                else {
                    ws._connectionChunks.push(connectionChunk);
                }
            }
        }
        return true;
    }
    if (payload.type === 'answer') {
        const { sdp, to } = payload;
        const client = getClientById(clients, to);
        if (!client || !authorize(ws, client))
            return true;
        sendPayload(client, { type: 'answer', from: ws._uuid, sdp });
        return true;
    }
    if (type === 'candidate') {
        const { candidate, connectionId, to } = payload;
        if (candidate) {
            if (connectionId) {
                const existingChunk = ws._connectionChunks.find(({ id }) => connectionId === id);
                if (existingChunk) {
                    existingChunk.signals.push({ type: 'candidate', candidate });
                }
                else {
                    const to = ws._acceptedOffers[connectionId];
                    const client = getClientById(clients, to);
                    if (!client || !authorize(ws, client))
                        return true;
                    sendPayload(client, { type: 'candidate', from: ws._uuid, candidate });
                }
            }
            else if (to) {
                const client = getClientById(clients, to);
                if (!client || !authorize(ws, client))
                    return true;
                sendPayload(client, { type: 'candidate', from: ws._uuid, candidate });
            }
        }
        return true;
    }
    return false;
};
/* harmony default export */ __webpack_exports__["default"] = (handleWRTCSignal);


/***/ })

/******/ });
//# sourceMappingURL=server.js.map