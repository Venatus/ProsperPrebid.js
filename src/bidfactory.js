import { getUniqueIdentifierStr } from './utils.js';

/**
 Required paramaters
 bidderCode,
 height,
 width,
 statusCode
 Optional paramaters
 adId,
 cpm,
 ad,
 adUrl,
 dealId,
 priceKeyString;
 */
function Bid(statusCode, {src = 'client', bidder = '', bidId, transactionId, adUnitId, auctionId} = {}) {
  var _bidSrc = src;
  var _statusCode = statusCode || 0;

  Object.assign(this, {
    bidderCode: bidder,
    width: 0,
    height: 0,
    statusMessage: _getStatus(),
    adId: getUniqueIdentifierStr(),
    requestId: bidId,
    transactionId,
    adUnitId,
    auctionId,
    mediaType: 'banner',
    source: _bidSrc
  })

  function _getStatus() {
    switch (_statusCode) {
      case 0:
        return 'Pending';
      case 1:
        return 'Bid available';
      case 2:
        return 'Bid returned empty or error response';
      case 3:
        return 'Bid timed out';
    }
  }

  this.getStatusCode = function () {
    return _statusCode;
  };

  // returns the size of the bid creative. Concatenation of width and height by ‘x’.
  this.getSize = function () {
    return this.width + 'x' + this.height;
  };

  this.getIdentifiers = function () {
    return {
      src: this.source,
      bidder: this.bidderCode,
      bidId: this.requestId,
      transactionId: this.transactionId,
      adUnitId: this.adUnitId,
      auctionId: this.auctionId
    }
  };
}

// Bid factory function.
export function createBid(statusCode, identifiers) {
  return new Bid(statusCode, identifiers);
}

export function restoreValidBid(origBid) {
  const bid = createBid(1, origBid);
  const {adId, adapterCode, adResponse, adUnitCode, bidder, bidderCode, width, height, ad, mediaType, renderer, requestTimestamp, ttl, cpm, originalCPM, originalCurrency, ...rest} = origBid;
  try{
    /*if(bid.bidderCode && bid.bidderCode.indexOf('debugger')==-1){
      debugger;
    }else*/ if(!bid.bidderCode){
      debugger;
    }
  }catch(e){
    debugger;
  }
  if (rest) {
    
  }
  bid.adId = adId;
  bid.adapterCode = adapterCode;
  bid.adResponse = adResponse;
  bid.adUnitCode = adUnitCode;
  bid.bidder = bidder;
  bid.bidderCode = bidderCode;
  bid.ad = ad;
  bid.cpm = cpm;
  bid.mediaType = mediaType;
  bid.originalCPM = originalCPM;
  bid.width = width;
  bid.height = height;
  bid.requestTimestamp = requestTimestamp;
  bid.renderer = renderer;
  bid.ttl = ttl;
  return bid;
}