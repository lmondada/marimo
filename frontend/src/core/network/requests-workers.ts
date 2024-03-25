import { API } from "./api";
import { createNetworkRequests } from "./requests-network";
import { EditRequests, RunRequests } from "./types";

export function createWorkersRequests(): EditRequests & RunRequests {
  let requests = createNetworkRequests();
  // TODO: overwrite requests where useful (eventually everywhere?)
  requests.sendRun = async (cellIds, codes, options) => {
    if (!options?.handlers) {
      console.error(
        "compilation handlers cannot be null for workers runtime mode",
      );
      return null;
    }
    const { jobId }: { jobId: string } = await API.post(
      "/compile/submit",
      {
        cellIds,
        codes,
      },
      { baseUrl: options.baseUrl ?? undefined },
    );
    API.sse(`/compile/status?jobId=${encodeURIComponent(jobId)}`, options);
    return null;
  };
  return requests;
}
