import { uniques, flatten } from './utils';
import {getPriceBucketString} from './cpmBucketManager';

var CONSTANTS = require('./constants.json');
var utils = require('./utils.js');
var events = require('./events');
var bidfactory = require('./bidfactory.js');
var bidmanager = require('./bidmanager.js');

var objectType_function = 'function';

var externalCallbacks = {byAdUnit: [], all: [], oneTime: null, timer: false};
var _granularity = CONSTANTS.GRANULARITY_OPTIONS.MEDIUM;
let _customPriceBucket;
var defaultBidderSettingsMap = {};
var pushedTimedoutBids = false;

exports.setCustomPriceBucket = function(customConfig) {
  _customPriceBucket = customConfig;
};

/**
 * Returns a list of bidders that we haven't received a response yet
 * @return {array} [description]
 */
exports.getTimedOutBidders = function () {
  return $$PREBID_GLOBAL$$._bidsRequested
    .map(getBidderCode)
    .filter(uniques)
    .filter(bidder => $$PREBID_GLOBAL$$._bidsReceived
      .map(getBidders)
      .filter(uniques)
      .indexOf(bidder) < 0);
};

function timestamp() { return new Date().getTime(); }

function getBidderCode(bidSet) {
  return bidSet.bidderCode;
}

function getBidders(bid) {
  return bid.bidder;
}

function getAdUnit(adUnitCode) {
  return $$PREBID_GLOBAL$$.adUnits.find(unit => unit.code === adUnitCode);
}
function updateLastModified(adUnitCode) {
  var adUnit = getAdUnit(adUnitCode);
  if (adUnit) {
    //introduce a new property here for now.
    //we could use the bidResponses to figure this value out
    //this value will be used in the cleanup handler
    adUnit._lastModified = timestamp();
  }
}

function bidsBackAdUnit(adUnitCode) {
/* figure out what indexchange is doing here..probably same issue as rubicon??
  const requested = $$PREBID_GLOBAL$$._bidsRequested
    .map(request => request.bids
      .filter(bid => bid.placementCode === adUnitCode))
    .reduce(flatten)
    .map(bid => {
      return bid.bidder === 'indexExchange' ?
          bid.sizes.length :
          1;
    }).reduce(add, 0);
*/

  let adunit = getAdUnit(adUnitCode);
  if(!adunit){    
    //debugger;
    return false;//adUnit not found??!! throw error i suppose
  }
  const requested = adunit.bids.length;
  let subRequestcount = 0;
  for(let i=0;i<adunit.bids.length;i++){
    if(adunit.bids[i].requestCount > 0){
      subRequestcount += adunit.bids[i].requestCount - 1;
    }
  }
  const received = $$PREBID_GLOBAL$$._bidsReceived.filter(bid => bid.adUnitCode === adUnitCode).length;
  return requested + subRequestcount === received;
}

/* jshint ignore:start */
function add(a, b) {
  return a + b;
}
/* jshint ignore:end */

function bidsBackAll() {
  const requested = $$PREBID_GLOBAL$$._bidsRequested
    .map(request => request.bids)
    .reduce(flatten)
    .map(bid => {
      return bid.bidder === 'indexExchange' ?
        bid.sizes.length :
        1;
    }).reduce(add, 0);
  //const requested = $$PREBID_GLOBAL$$._bidsRequested.map(bidSet => bidSet.bids.length).reduce(add, 0);
  /* jshint ignore:start */
  //const requested = ($$PREBID_GLOBAL$$._bidsRequested.length === 0) ? 0 : $$PREBID_GLOBAL$$._bidsRequested.map(bidSet => bidSet.bids.length).reduce(add);
  const received = $$PREBID_GLOBAL$$._bidsReceived.length;
  
  return requested === received
    || received > requested;//late receivers from previous requestBids after a new requestBids 
  /* jshint ignore:end */  
}

exports.bidsBackAll = function () {
  return bidsBackAll();
};

function getBidSet(bidder, adUnitCode) {
  return $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => {
    return bidSet.bids.filter(bid => bid.bidder === bidder && bid.placementCode === adUnitCode).length > 0;
  }) || { start: null, requestId: null };
}
/* jshint ignore:start */
function getGlobalBidResponse(request) {
  var resp = $$PREBID_GLOBAL$$._bidsReceived.find(bidSet => request.bidId === bidSet.adId);
  if (!resp) {
    resp = $$PREBID_GLOBAL$$._allReceivedBids.find(bidSet => request.bidId === bidSet.adId);
    //debugger;
  }
  return resp;
}
/* jshint ignore:end */

/* jshint ignore:start */
function getBidSetForBidder(bidder) {
  return $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === bidder) || { start: null, requestId: null };
}
/* jshint ignore:end */
function getBidSetForBidderGlobal(bid, adUnitCode) {
  var bidRequest;
  var bidderObj = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === bid.bidderCode);
  if (bidderObj && bidderObj.bids) {
    bidRequest = bidderObj.bids.find(bidRequest => bidRequest.placementCode === adUnitCode && (!bid.adId || (bid.adId === bidRequest.bidId)) && (!bid.sizeId || (bid.sizeId === bidRequest.sizeId)));
      //if the response knows its bidId, compare it as well, usefull if multiple bidders of the same BidderCode exists for the same adUnit //maybe instead have a requestId, as a bidder might also have multiple responses per bidId...?    
    if (bidRequest) {
      /* jshint ignore:start */
      return { bidSet: bidderObj, request: bidRequest, response: getGlobalBidResponse(bidRequest) };
      /* jshint ignore:end */
    }
  }
  //debugger;
  for (var i = 0; i < $$PREBID_GLOBAL$$._allRequestedBids.length; i++) {
    bidderObj = $$PREBID_GLOBAL$$._allRequestedBids[i];
    if (bidderObj.bidderCode === bid.bidderCode) {
      for (var j in bidderObj.bids) {
        bidRequest = bidderObj.bids[j];
        if (bidderObj.bids[j].placementCode === adUnitCode && (!bid.adId || (bid.adId === bidRequest.bidId)) && (!bid.sizeId || (bid.sizeId === bidRequest.sizeId))) {//if the response knows its bidId, compare it as well, usefull if multiple bidders of the same BidderCode exists for the same adUnit
          //debugger;
          if (bidRequest) {
            /* jshint ignore:start */
            return { bidSet: bidderObj, request: bidRequest, response: getGlobalBidResponse(bidRequest) };
            /* jshint ignore:end */
          }
        }
      }
    }
  }
  return { bidSet: { start: null, requestId: null }, request: null, response: null };
}
/*
 *   This function should be called to by the bidder adapter to register a bid response
 */
exports.addBidResponse = function (adUnitCode, bid) {
  if (bid) {
    //first lookup bid request and assign it back the bidId if it matches the adUnitCode
    /*
    seems redundant with bidRequest.request.bidId;
    if (!bid.adId) {
      let bidRequest = getBidSetForBidder(bid.bidderCode).bids.find(bidRequest => bidRequest.placementCode === adUnitCode);
      if (bidRequest && bidRequest.bidId) {
        bid.adId = bidRequest.bidId;
      }
    }*/
    
    let bidRequest = getBidSetForBidderGlobal(bid, adUnitCode);
    var origBid;
    if (bidRequest.response) {
      if (bidRequest.response.getStatusCode() === 3 && bid.getStatusCode() !== 1) {
        //bid already timed out, and new bid doesn't add value
        //debugger;
        return;
      }
      //if reached here, the bid was timed out before, but received a valid responsive after this time
      //keeping the books complete, but we won't trigger the callbacks
      //debugger;
      origBid = bid;
      bid = bidRequest.response;
      var bidClone = Object.assign({}, bid);
      Object.assign(bid, origBid);
      Object.assign(bid, {
        statusMessage: bidClone.statusMessage,
      });
    }
    if (bidRequest.request && bidRequest.request.bidId && !bid.adId) {
      bid.adId = bidRequest.request.bidId;
    }
    const { requestId, start } = getBidSet(bid.bidderCode, adUnitCode);
    Object.assign(bid, {
      requestId: requestId,
      responseTimestamp: timestamp(),
      requestTimestamp: start,
      cpm: bid.cpm || 0,
      bidder: bid.bidderCode,
      adUnitCode
    });

    bid.timeToRespond = bid.responseTimestamp - bid.requestTimestamp;

    /*if (bid.timeToRespond > $$PREBID_GLOBAL$$.cbTimeout + $$PREBID_GLOBAL$$.timeoutBuffer) {
      const timedOut = true;

      exports.executeCallback(timedOut);
    }*/

    //emit the bidAdjustment event before bidResponse, so bid response has the adjusted bid value
    events.emit(CONSTANTS.EVENTS.BID_ADJUSTMENT, bid);

    //emit the bidResponse event
    events.emit(CONSTANTS.EVENTS.BID_RESPONSE, bid);

    //append price strings
    const priceStringsObj = getPriceBucketString(bid.cpm, _customPriceBucket);
    bid.pbLg = priceStringsObj.low;
    bid.pbMg = priceStringsObj.med;
    bid.pbHg = priceStringsObj.high;
    bid.pbAg = priceStringsObj.auto;
    bid.pbDg = priceStringsObj.dense;
    bid.pbCg = priceStringsObj.custom;

    //if there is any key value pairs to map do here
    var keyValues = {};
    if (bid.bidderCode && bid.cpm !== 0) {
      keyValues = getKeyValueTargetingPairs(bid.bidderCode, bid);

      if (bid.dealId) {
        keyValues[`hb_deal_${bid.bidderCode}`] = bid.dealId;
      }

      bid.adserverTargeting = keyValues;
    }
    //don't add if a response already exists
    if (!bidRequest.response)
      $$PREBID_GLOBAL$$._bidsReceived.push(bid);

    if (bidRequest.response) {
      //abort, these callbacks are already been called, due to timeout conditions
      return;
    }
    if (bid.adUnitCode && bidsBackAdUnit(bid.adUnitCode)) {
      console.log("callback adunit complete: " + bid.adUnitCode);
      triggerAdUnitCallbacks(bid.adUnitCode);
      updateLastModified(bid.adUnitCode);
    } else {
      //debugger;
      //bidsBackAdUnit(bid.adUnitCode);
      console.log("adunit not complete yet: " + bid.adUnitCode);
    }
  }

  if (bidsBackAll()) {
    exports.executeCallback();
  }

  if (bid && bid.timeToRespond > $$PREBID_GLOBAL$$.bidderTimeout) {

    const timedOut = true;
    this.executeCallback(timedOut);
  }
};

function getKeyValueTargetingPairs(bidderCode, custBidObj) {
  var keyValues = {};
  var bidder_settings = $$PREBID_GLOBAL$$.bidderSettings;

  //1) set the keys from "standard" setting or from prebid defaults
  if (custBidObj && bidder_settings) {
    //initialize default if not set
    const standardSettings = getStandardBidderSettings();
    setKeys(keyValues, standardSettings, custBidObj);
  }

  //2) set keys from specific bidder setting override if they exist
  if (bidderCode && custBidObj && bidder_settings && bidder_settings[bidderCode] && bidder_settings[bidderCode][CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING]) {
    setKeys(keyValues, bidder_settings[bidderCode], custBidObj);
    custBidObj.alwaysUseBid = bidder_settings[bidderCode].alwaysUseBid;
    filterIfSendStandardTargeting(bidder_settings[bidderCode]);
  }

  //2) set keys from standard setting. NOTE: this API doesn't seem to be in use by any Adapter
  else if (defaultBidderSettingsMap[bidderCode]) {
    setKeys(keyValues, defaultBidderSettingsMap[bidderCode], custBidObj);
    custBidObj.alwaysUseBid = defaultBidderSettingsMap[bidderCode].alwaysUseBid;
    filterIfSendStandardTargeting(defaultBidderSettingsMap[bidderCode]);
  }

  function filterIfSendStandardTargeting(bidderSettings) {
    if (typeof bidderSettings.sendStandardTargeting !== "undefined" && bidderSettings.sendStandardTargeting === false) {
      for(var key in keyValues) {
        if(CONSTANTS.TARGETING_KEYS.indexOf(key) !== -1) {
          delete keyValues[key];
        }
      }
    }
  }

  return keyValues;
}

exports.getKeyValueTargetingPairs = function () {
  return getKeyValueTargetingPairs(...arguments);
};

function setKeys(keyValues, bidderSettings, custBidObj) {
  var targeting = bidderSettings[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING];
  custBidObj.size = custBidObj.getSize();

  utils._each(targeting, function (kvPair) {
    var key = kvPair.key;
    var value = kvPair.val;

    if (keyValues[key]) {
      utils.logWarn('The key: ' + key + ' is getting ovewritten');
    }

    if (utils.isFn(value)) {
      try {
        value = value(custBidObj);
      } catch (e) {
        utils.logError('bidmanager', 'ERROR', e);
      }
    }

    if (
      typeof bidderSettings.suppressEmptyKeys !== "undefined" && bidderSettings.suppressEmptyKeys === true &&
      (
        utils.isEmptyStr(value) ||
        value === null ||
        value === undefined
      )
    ) {
      utils.logInfo("suppressing empty key '" + key + "' from adserver targeting");
    } else {
      keyValues[key] = value;
    }

  });

  return keyValues;
}

exports.setPriceGranularity = function setPriceGranularity(granularity) {
  var granularityOptions = CONSTANTS.GRANULARITY_OPTIONS;
  if (Object.keys(granularityOptions).filter(option => granularity === granularityOptions[option])) {
    _granularity = granularity;
  } else {
    utils.logWarn('Prebid Warning: setPriceGranularity was called with invalid setting, using' +
      ' `medium` as default.');
    _granularity = CONSTANTS.GRANULARITY_OPTIONS.MEDIUM;
  }
};

exports.registerDefaultBidderSetting = function (bidderCode, defaultSetting) {
  defaultBidderSettingsMap[bidderCode] = defaultSetting;
};

exports.executeCallback = function (timedOut) {
  // if there's still a timeout running, clear it now
  if (!timedOut && externalCallbacks.timer) {
    clearTimeout(externalCallbacks.timer);
  }
  //if (this !== bidmanager) {
  if(!pushedTimedoutBids){
    pushedTimedoutBids = true;
    //handling timed out bids
    //basically find all bid requests, which don't have a corresponding bidresponse
    //for each occurance add a dummy responsose with status=3 (time out)
    //please note that this purposely allow late bids still to arrive and still trigger the events (see addBidResponse), but not the callbacks.
    //the stutus of the bid currently remains status=3, even for late arravals, but will be updated with the most recent data (maybe add status=5, timeout but arrived late and is renderable or a seperate boolean, rendable)
    //in a nuttshell this also needed to trigger the adUnitsBidsBack callback, as that will only trigger if the requested amount matches the responded amount
    //hence we need fake/timed out responses  
    var resultIds = $$PREBID_GLOBAL$$._bidsReceived.map(bid => bid.adId);

    var timedoutBids = $$PREBID_GLOBAL$$._bidsRequested.reduce((arr, val) => { arr.push.apply(arr, val.bids.filter(bid => resultIds.indexOf(bid.bidId) === -1)); return arr; }, []);//.filter(bid => !resultIds.find(bid.bidId));
    var getBid = function(bid){
        var bidObj = bidfactory.createBid(3);
        bidObj.bidderCode = bid.bidder;
        return bidObj;
     };  
    timedoutBids.map(bid => {
      //      debugger;
      var bidObj;
      if(bid.props && bid.props.length>0){
        for(let i=0;i<bid.props.length;i++){
          bidObj = getBid(bid);
          for(var j in bid.props[i]){
            bidObj[j] = bid.props[i][j];
          }
          bidmanager.addBidResponse(bid.placementCode, bidObj);
        }
      }else if(bid.requestCount>0){
        for(let i=0;i<bid.requestCount;i++){
          //bidObj = bidfactory.createBid(3);
          //bidObj.bidderCode = bid.bidder;
          //bidObj.sizeId = Math.random();
          bidmanager.addBidResponse(bid.placementCode, getBid(bid));  
        }
      }else{
        bidmanager.addBidResponse(bid.placementCode, getBid(bid));
      }
    });
    //if (timedoutBids.length > 0)
    //  debugger;
    //}
  }
  /*if (externalCallbackArr.called !== true) {
    processCallbacks(externalCallbackArr);
    externalCallbackArr.called = true;*/

  if (externalCallbacks.all.called !== true) {
    processCallbacks(externalCallbacks.all);
    externalCallbacks.all.called = true;

    if (timedOut) {
      const timedOutBidders = exports.getTimedOutBidders();

      if (timedOutBidders.length) {
        events.emit(CONSTANTS.EVENTS.BID_TIMEOUT, timedOutBidders);
      }
    }
  }

  //execute one time callback
  if (externalCallbacks.oneTime) {
    try {
      processCallbacks([externalCallbacks.oneTime]);
    }
    finally {
      externalCallbacks.oneTime = null;
      externalCallbacks.timer = false;
      $$PREBID_GLOBAL$$.clearAuction();
    }
  }
};

function triggerAdUnitCallbacks(adUnitCode) {
  //todo : get bid responses and send in args
  var params = [adUnitCode];
  processCallbacks(externalCallbacks.byAdUnit, params);
}

function processCallbacks(callbackQueue, ...params) {
  var i;
  if (utils.isArray(callbackQueue)) {
    for (i = 0; i < callbackQueue.length; i++) {
      var func = callbackQueue[i];
      if (params.length > 0) {//etc.......
        //simple workaround if `triggerAdUnitCallbacks` passes the ad-unit code, the callback should receive the complete adunit-code
        //todo: refactor global/adunit-callbacks? or use apply?
        //debugger; 
        //var x = $$PREBID_GLOBAL$$._bidsReceived.reduce(groupByPlacement, {});
        //if (!(params[0] in x)) {
        //  debugger;//shouldn't happen, otherwise the request might already live in _allReceivedBids
        //}
        //todo: groupByPlacement seems to appear on top in the profiler, see if it can be optimized?
        func.call($$PREBID_GLOBAL$$, $$PREBID_GLOBAL$$._bidsReceived.reduce(groupByPlacement, {}), params[0]);
      } else
        func.call($$PREBID_GLOBAL$$, $$PREBID_GLOBAL$$._bidsReceived.reduce(groupByPlacement, {}));
    }
  }
}

/**
 * groupByPlacement is a reduce function that converts an array of Bid objects
 * to an object with placement codes as keys, with each key representing an object
 * with an array of `Bid` objects for that placement
 * @param prev previous value as accumulator object
 * @param item current array item
 * @param idx current index
 * @param arr the array being reduced
 * @returns {*} as { [adUnitCode]: { bids: [Bid, Bid, Bid] } }
 */
function groupByPlacement(prev, item, idx, arr) {
  // this uses a standard "array to map" operation that could be abstracted further
  if (item.adUnitCode in Object.keys(prev)) {
    // if the adUnitCode key is present in the accumulator object, continue
    return prev;
  } else {
    // otherwise add the adUnitCode key to the accumulator object and set to an object with an
    // array of Bids for that adUnitCode
    prev[item.adUnitCode] = {
      bids: arr.filter(bid => bid.adUnitCode === item.adUnitCode)
    };
    return prev;
  }
}

/**
 * Add a one time callback, that is discarded after it is called
 * @param {Function} callback
 * @param timer Timer to clear if callback is triggered before timer time's out
 */
exports.addOneTimeCallback = function (callback, timer) {
  externalCallbacks.oneTime = callback;
  externalCallbacks.timer = timer;
};

exports.addCallback = function (id, callback, cbEvent) {
  callback.id = id;
  if (CONSTANTS.CB.TYPE.ALL_BIDS_BACK === cbEvent) {
    externalCallbacks.all.push(callback);
  } else if (CONSTANTS.CB.TYPE.AD_UNIT_BIDS_BACK === cbEvent) {
    externalCallbacks.byAdUnit.push(callback);
  }
};

exports.removeCallback = function (id, callback, cbEvent) {
  var arr = [];
  if (CONSTANTS.CB.TYPE.ALL_BIDS_BACK === cbEvent) {
    arr = externalCallbacks.all;
  } else if (CONSTANTS.CB.TYPE.AD_UNIT_BIDS_BACK === cbEvent) {
    arr = externalCallbacks.byAdUnit;
  }  
  for (var i = 0; i < arr.length; i++) {
    //id method never seems to be invoked, so it remains a function reference, ignore the id for now
    if (/*arr[i].id === id ||*/ arr[i] === callback) {
      arr.splice(i, 1);
      break;//assume only 1 occurance
    }
  }

};

//considder calling this on callBids in the adapterManager?
exports.resetAuctionState = function(){
  //externalCallbackArr.called = false; //should proably be added as well, but unsafe as nobody expect this value to reset, as removeCallback didn't exist
  pushedTimedoutBids = false;
};

//register event for bid adjustment
events.on(CONSTANTS.EVENTS.BID_ADJUSTMENT, function (bid) {
  adjustBids(bid);
});

function adjustBids(bid) {
  var code = bid.bidderCode;
  var bidPriceAdjusted = bid.cpm;
  if (code && $$PREBID_GLOBAL$$.bidderSettings && $$PREBID_GLOBAL$$.bidderSettings[code]) {
    if (typeof $$PREBID_GLOBAL$$.bidderSettings[code].bidCpmAdjustment === objectType_function) {
      try {
        bidPriceAdjusted = $$PREBID_GLOBAL$$.bidderSettings[code].bidCpmAdjustment.call(null, bid.cpm, utils.extend({}, bid));
      }
      catch (e) {
        utils.logError('Error during bid adjustment', 'bidmanager.js', e);
      }
    }
  }

  if (bidPriceAdjusted >= 0) {
    bid.cpm = bidPriceAdjusted;
  }
}

exports.adjustBids = function() {
  return adjustBids(...arguments);
};

function getStandardBidderSettings() {
  let bidder_settings = $$PREBID_GLOBAL$$.bidderSettings;
  if (!bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD]) {
    bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD] = {
      adserverTargeting: [
        {
          key: 'hb_bidder',
          val: function (bidResponse) {
            return bidResponse.bidderCode;
          }
        }, {
          key: 'hb_adid',
          val: function (bidResponse) {
            return bidResponse.adId;
          }
        }, {
          key: 'hb_pb',
          val: function (bidResponse) {
            if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.AUTO) {
              return bidResponse.pbAg;
            } else if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.DENSE) {
              return bidResponse.pbDg;
            } else if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.LOW) {
              return bidResponse.pbLg;
            } else if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.MEDIUM) {
              return bidResponse.pbMg;
            } else if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.HIGH) {
              return bidResponse.pbHg;
            } else if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.CUSTOM) {
              return bidResponse.pbCg;
            }
          }
        }, {
          key: 'hb_size',
          val: function (bidResponse) {
            return bidResponse.size;
          }
        }
      ]
    };
  }
  return bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD];
}

function getStandardBidderAdServerTargeting() {
  return getStandardBidderSettings()[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING];
}

exports.getStandardBidderAdServerTargeting = getStandardBidderAdServerTargeting;
