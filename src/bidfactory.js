var utils = require('./utils.js');

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
function Bid(statusCode, bidRequest) {
  var _bidSrc = (bidRequest && bidRequest.src) || 'client';
  var _statusCode = statusCode || 0;

  this.bidderCode = (bidRequest && bidRequest.bidder) || '';
  this.width = 0;
  this.height = 0;
  this.statusMessage = _getStatus();
  this.adId = utils.getUniqueIdentifierStr();
  this.requestId = bidRequest && bidRequest.bidId;
  this.mediaType = 'banner';
  this.source = _bidSrc;

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

  this.adjustCPM = function (cpm) {
    if (this.origCPM == null && this.cpm && this.cpm != cpm) {
      this.origCPM = this.cpm;
    }
    this.cpm = cpm;
  };

  // returns the size of the bid creative. Concatenation of width and height by ‘x’.
  this.getSize = function () {
    return this.width + 'x' + this.height;
  };
}

// Bid factory function.
export function createBid(statusCode, bidRequest) {
  return new Bid(statusCode, bidRequest);
}

export function restoreValidBid(origBid) {
  const bid = createBid(1, origBid);
  const {adId, width, height, ad, requestTimestamp, ttl, cpm, originalCPM, originalCurrent, ...rest} = origBid;
  if (rest) {

  }
  bid.adId = adId;
  bid.ad = ad;
  bid.cpm = cpm;
  bid.originalCPM = originalCPM;
  bid.width = width;
  bid.height = height;
  bid.requestTimestamp = requestTimestamp;
  bid.ttl = ttl;
  return bid;
}
