import * as utils from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {isNumber, isArray, isFn, isStr} from '../src/utils.js';
import { createBid } from '../src/bidfactory.js';
const CONSTANTS = require('../src/constants.json');
const BIDDER_CODE = '_debugger';

let creativeId = 0;

function rndN(n, p) {
  if (arguments.length == 1 || !p) {
    p = 2;
  }
  return (Math.round(n * Math.pow(10, p)) / Math.pow(10, p));
}

const defaultFormats = {
  skin: function(code, bid, bidResponse, defaultFormats) {
    return '<script>if(self.frameElement){self.frameElement.style.display="none";var div = self.frameElement.ownerDocument.body.appendChild(self.frameElement.ownerDocument.createElement("div"));div.style.position="fixed";div.style.left=0;div.style.top=0;div.style.height=div.style.width="250px";div.style.zIndex=0xFFFFFFFF;div.style.backgroundColor="darkGray";div.innerHTML="skin ' + rndN(bidResponse.cpm, 2) + '";self.addEventListener("unload",function(){div.parentNode.removeChild(div);});}<\/script>';
  }
};

function getBidResponse(bid, size) {
  if (!size) {
    size = bid.sizes[Math.round(Math.random() * (bid.sizes.length - 1))];
  }
  if (!size) {
    debugger;
  }
  let sizeStr;
  if (isArray(size)) {
    sizeStr = size.join('x');
  } else {
    sizeStr = size;
  }
  // debugger;
  let cpm = 20;
  let priceParams = bid.params;
  if (bid.params && bid.params.bidPriceSize && bid.params.bidPriceSize[sizeStr]) {
    priceParams = bid.params.bidPriceSize[sizeStr];
  }

  if (priceParams != bid.params && ((priceParams.responseRate && (1 - priceParams.responseRate) >= Math.random()) || priceParams.noBid)) {
    return createBid(CONSTANTS.STATUS.NO_BID, {
      bidderCode: BIDDER_CODE
    });
  }

  if (priceParams) {
    if (priceParams.price >= 0) {
      cpm = priceParams.price;
    } else if (priceParams.priceBase >= 0 && priceParams.priceRange > 0) {
      cpm = priceParams.priceBase + (Math.random() * priceParams.priceRange);
    }
  }
  // debugger;
  const defaultStyle = 'border: 1px solid black;box-sizing: border-box;box-shadow: inset 0px 0px 3px 3px rgb(0,0,0,.16);padding: 4px;';
  const bidResponse = {
    requestId: bid.bidId,
    cpm: cpm,
    width: size[0],
    height: size[1],
    creativeId: creativeId++,
    dealId: null,
    currency: 'USD',
    netRevenue: true,
    ttl: 300,
    referrer: 'http://localhost',
    ad: '<div id="bid_id_' + bid.bidId + '" title="' + bid.bidder + '" style="width:' + size[0] + 'px;height:' + size[1] + 'px;background-color:rgba(237, 237, 237, 0.8);' + defaultStyle + '">DEBUG AD (' + size[0] + 'x' + size[1] + ', cpm: ' + rndN(cpm, 2) + ')</div>'
  };
  if (isNumber(bid.params.bidTTL)) {
    bidResponse.ttl = bid.params.bidTTL;
  }
  if (isFn(bid.params.cpmFunc)) {
    bid.params.cpmFunc(bid, bidResponse);
  }
  if (priceParams.ad) {
    if (isStr(priceParams.ad)) {
      bidResponse.ad += priceParams.ad;
    } else if (isFn(priceParams.ad)) {
      bidResponse.ad = priceParams.ad(bidResponse.ad, bid, bidResponse, defaultFormats);
    }
  } else if(bid.params.ad) {
    if (isStr(bid.params.ad)) {
      bidResponse.ad += bid.params.ad;
    } else if (isFn(bid.params.ad)) {
      bidResponse.ad = bid.params.ad(bidResponse.ad, bid, bidResponse, defaultFormats);
    }
  }
  if (bid.params.adBreakout || priceParams.adBreakout) {
    bidResponse.ad += '<script>if(self.frameElement){self.frameElement.style.display="none";var div =self.document.getElementById("bid_id_' + bid.bidId + '"); if(div){self.frameElement.parentNode.insertBefore(div, self.frameElement);}}<\/script>';
  }
  return bidResponse;
}

export const spec = {
  code: BIDDER_CODE,
  aliases: [], // short code
  /**
     * Determines whether or not the given bid request is valid.
     *
     * @param {BidRequest} bid The bid params to validate.
     * @return boolean True if this is a valid bid, and false otherwise.
     */
  isBidRequestValid: function(bid) {
    return true;
  },
  /**
     * Make a server request from the list of BidRequests.
     *
     * @param {validBidRequests[]} - an array of bids
     * @return ServerRequest Info describing the request to the server.
     */
  buildRequests: function(validBidRequests) {
    // debugger;

    const response = [];
    validBidRequests.forEach(bid => {
      let respond = true;
      let bidSize;

      if ((bid.params.responseRate && (1 - bid.params.responseRate) >= Math.random()) || bid.params.noBid) {
        respond = false;
      }
      if (bid.params.bidSizes) {
        if (bid.params.bidSizes.length == 0) {
          respond = false;
        } else if (bid.params.bidSizes.length == 1) {
          // debugger;
          bidSize = bid.params.bidSizes[0];
          if (bid.params.matchBidSize) {
            const intersectSizes = bid.sizes.filter(bidSizef => bidSizef[0] == bidSize[0] && bidSizef[1] == bidSize[1]);
            if (intersectSizes.length > 0) {
              // debugger;
              // do nothing!
            } else {
              respond = false;
            }
          }
        } else {
          // debugger;
          const intersectSizes = bid.sizes.filter(bidSize => bid.params.bidSizes.filter(pBidSize => pBidSize[0] == bidSize[0] && pBidSize[1] == bidSize[1]).length > 0);
          if (intersectSizes.length > 0) {
            bidSize = intersectSizes[Math.round(Math.random() * (intersectSizes.length - 1))];
          } else {
            // debugger;
            respond = false;
          }
        }
      }
      if (respond) {
        response.push(getBidResponse(bid, bidSize));
      }
    });

    return {
      method: 'DIRECT',
      response: {
        responseText: JSON.stringify(response),
        getResponseHeader: function(hdr) {}
      }
    };
  },
  /**
     * Unpack the response from the server into a list of bids.
     *
     * @param {ServerResponse} serverResponse A successful response from the server.
     * @return {Bid[]} An array of bids which were nested inside the server.
     */
  interpretResponse: function(serverResponse, bidRequest) {
    // const serverBody  = serverResponse.body;
    // const headerValue = serverResponse.headers.get('some-response-header');
    // debugger;
    const bidResponses = serverResponse.body;

    return bidResponses;
  },

  /**
     * Register the user sync pixels which should be dropped after the auction.
     *
     * @param {SyncOptions} syncOptions Which user syncs are allowed?
     * @param {ServerResponse[]} serverResponses List of server's responses.
     * @return {UserSync[]} The user syncs which should be dropped.
     */
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = []
    return syncs;
  },

  /**
     * Register bidder specific code, which will execute if bidder timed out after an auction
     * @param {data} Containing timeout specific data
     */
  onTimeout: function(data) {
    // Bidder specifc code
  },

  /**
     * Register bidder specific code, which will execute if a bid from this bidder won the auction
     * @param {Bid} The bid that won the auction
     */
  onBidWon: function(bid) {
    // Bidder specific code
  },

  /**
     * Register bidder specific code, which will execute when the adserver targeting has been set for a bid from this bidder
     * @param {Bid} The bid of which the targeting has been set
     */
  onSetTargeting: function(bid) {
    // Bidder specific code
  }
}
registerBidder(spec);
