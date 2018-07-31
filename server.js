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

/***/ "./src/constants.ts":
/*!**************************!*\
  !*** ./src/constants.ts ***!
  \**************************/
/*! exports provided: INIT, OFFER_REQUEST, OFFER_ACCEPTED */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "INIT", function() { return INIT; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "OFFER_REQUEST", function() { return OFFER_REQUEST; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "OFFER_ACCEPTED", function() { return OFFER_ACCEPTED; });
const INIT = 'init';
const OFFER_REQUEST = 'offerRequest';
const OFFER_ACCEPTED = 'offerAccepted';


/***/ }),

/***/ "./src/server.ts":
/*!***********************!*\
  !*** ./src/server.ts ***!
  \***********************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _constants__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./constants */ "./src/constants.ts");

// Payloads (importing from fast-rtc-peer into a server env is a headache)
const OFFER = 'offer';
const ANSWER = 'answer';
const CANDIDATE = 'candidate';
const sendAnswer = (ws, from, sdp) => {
    ws.send(JSON.stringify({
        type: ANSWER,
        from,
        sdp
    }));
};
const sendCandidate = (ws, from, candidate) => {
    if (!ws)
        return;
    ws.send(JSON.stringify({
        type: CANDIDATE,
        from,
        candidate
    }));
};
const sendOffer = (ws, fromWS, offer) => {
    const { id, candidates, sdp } = offer;
    const { _uuid: from } = fromWS;
    fromWS.send(JSON.stringify({
        type: _constants__WEBPACK_IMPORTED_MODULE_0__["OFFER_ACCEPTED"],
        id,
        from: ws._uuid
    }));
    fromWS._acceptedOffers[id] = ws._uuid;
    ws.send(JSON.stringify({
        type: OFFER,
        from,
        sdp,
        candidates
    }));
};
const requestOffer = (ws) => {
    ws.send(JSON.stringify({
        type: _constants__WEBPACK_IMPORTED_MODULE_0__["OFFER_REQUEST"]
    }));
};
const getClientById = (clients, id) => {
    for (const client of clients) {
        if (client._uuid === id)
            return client;
    }
    return null;
};
class CachedOffer {
    constructor(offerId, sdp) {
        this.id = offerId;
        this.sdp = sdp;
        this.candidates = [];
        this.isComplete = false;
    }
}
const handleOnMessage = (clients, ws, payload) => {
    const { type } = payload;
    if (type === _constants__WEBPACK_IMPORTED_MODULE_0__["INIT"]) {
        const { sdp, offerId, from } = payload;
        ws._uuid = from;
        ws._offers = [new CachedOffer(offerId, sdp)];
        ws._requestors = [];
        ws._acceptedOffers = {};
        for (const existingPeer of clients) {
            if (existingPeer === ws || existingPeer.readyState !== ws.OPEN)
                continue;
            const offer = existingPeer._offers.pop();
            if (!offer) {
                existingPeer._requestors.push(ws);
            }
            else {
                sendOffer(ws, existingPeer, offer);
            }
            requestOffer(existingPeer);
        }
        return true;
    }
    if (type === OFFER) {
        const { sdp, offerId } = payload;
        const offer = new CachedOffer(offerId, sdp);
        const requestor = ws._requestors.pop();
        if (requestor) {
            sendOffer(requestor, ws._uuid, offer);
        }
        else {
            ws._offers.push(offer);
        }
        return true;
    }
    else if (type === ANSWER) {
        const { sdp, to } = payload;
        const client = getClientById(clients, to);
        if (client) {
            delete client._acceptedOffers[to];
            sendAnswer(client, ws._uuid, sdp);
        }
        return true;
    }
    if (type === CANDIDATE) {
        const { candidate, offerId, to } = payload;
        if (candidate) {
            if (offerId) {
                const offer = ws._offers.find(({ id }) => offerId === id);
                if (offer) {
                    offer.candidates.push(candidate);
                }
                else {
                    // the offer was already picked up by someone, find out who
                    const to = ws._acceptedOffers[offerId];
                    const client = getClientById(clients, to);
                    sendCandidate(client, ws._uuid, candidate);
                }
            }
            else if (to) {
                // for re-negotiations
                const client = getClientById(clients, to);
                sendCandidate(client, ws._uuid, candidate);
            }
        }
        return true;
    }
    return false;
};
/* harmony default export */ __webpack_exports__["default"] = (handleOnMessage);


/***/ })

/******/ });
//# sourceMappingURL=server.js.map