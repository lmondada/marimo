import { API } from "./api";
import { createNetworkRequests } from "./requests-network";
import { EditRequests, RunRequests } from "./types";

export function createWorkersRequests(): EditRequests & RunRequests {
  let requests = createNetworkRequests();
  // TODO: overwrite requests where useful (eventually everywhere?)
  requests.sendRun = async (cellIds, codes, handlers) => {
    if (!handlers) {
      console.error(
        "compilation handlers cannot be null for workers runtime mode",
      );
      return null;
    }
    const { jobId }: { jobId: string } = await API.post("/workers/compile", {
      cellIds,
      codes,
    });
    API.sse(
      `/workers/compilationStatus?jobId=${encodeURIComponent(jobId)}`,
      handlers,
    );
    return null;
  };
  return requests;
}
