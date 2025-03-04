import {GreedyPromise, greedySetTimeout} from '../../libraries/greedy/greedyPromise.js';
import {getGlobal} from '../prebidGlobal.js';

export let pbSetTimeout = getGlobal().setTimeout ?? (FEATURES.GREEDY ? greedySetTimeout : setTimeout)
export let PbPromise = getGlobal().Promise ?? (FEATURES.GREEDY ? GreedyPromise : Promise);

export function setPbTimeout(fun) {
  pbSetTimeout = fun;
}
export function setPbPromise(fun) {
  PbPromise = fun;
}

export function delay(delayMs = 0) {
  return new PbPromise((resolve) => {
    pbSetTimeout(resolve, delayMs);
  });
}

/**
 * @returns a {promise, resolve, reject} trio where `promise` is resolved by calling `resolve` or `reject`.
 */
export function defer({promiseFactory = (resolver) => new PbPromise(resolver)} = {}) {
  function invoker(delegate) {
    return (val) => delegate(val);
  }

  let resolveFn, rejectFn;

  return {
    promise: promiseFactory((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    }),
    resolve: invoker(resolveFn),
    reject: invoker(rejectFn)
  }
}
