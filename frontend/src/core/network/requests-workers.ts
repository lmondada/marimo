import { createNetworkRequests } from "./requests-network";
import { EditRequests, RunRequests } from "./types";

export function createWorkersRequests(): EditRequests & RunRequests {
  let requests = createNetworkRequests();
  // TODO: overwrite requests where useful (eventually everywhere?)
  return requests;
}
