import * as utils from 'src/utils';
import {config} from 'src/config';
import {registerBidder} from 'src/adapters/bidderFactory';
const BIDDER_CODE = '_debugger';

let creativeId = 0;

function getBidResponse(bid){
    const size = bid.sizes[Math.round(Math.random()*(bid.sizes.length-1))];
    if(!size){
        debugger;
    }
    const bidResponse = {
        requestId: bid.bidId,
        cpm:20,
        width: size[0],
        height: size[1],
        creativeId: creativeId++,
        dealId: null,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        referrer: 'http://localhost',
        ad: '<div style="width:'+size[0]+'px;height:'+size[1]+'px">DEBUG AD</div>'
    };
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
            //debugger;
            
            const response = [];
            validBidRequests.forEach(bid=>{
                response.push(getBidResponse(bid));
            });

            return {
                method: 'DIRECT',
                response: {
                    responseText:JSON.stringify(response),
                    getResponseHeader: function(hdr){}
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
            //const serverBody  = serverResponse.body;
            // const headerValue = serverResponse.headers.get('some-response-header');
            //debugger;
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