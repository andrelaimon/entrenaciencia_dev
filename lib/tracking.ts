import { getAnonymousId, getSessionId } from './identity';
import { getAllAttribution } from './utm';

/** Standard tracking context to spread into any form/event submission body. */
export function getTrackingContext() {
  return {
    anonymous_id: getAnonymousId(),
    session_id: getSessionId(),
    ...getAllAttribution(),
  };
}
