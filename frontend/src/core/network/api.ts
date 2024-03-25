/* Copyright 2024 Marimo. All rights reserved. */
import { once } from "@/utils/once";
import { Logger } from "../../utils/Logger";
import { getMarimoServerToken } from "../dom/marimo-tag";
import { getSessionId } from "../kernel/session";

const getServerTokenOnce = once(() => {
  return getMarimoServerToken();
});

/**
 * Wrapper around fetch that adds XSRF token and session ID to the request and
 * strong types.
 */
export const API = {
  post<REQ, RESP = null>(
    url: string,
    body: REQ,
    opts: {
      headers?: Record<string, string>;
      baseUrl?: string;
    } = {},
  ): Promise<RESP> {
    const baseUrl = opts.baseUrl ?? document.baseURI;
    const fullUrl = `${baseUrl}api${url}`;
    return fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...API.headers(),
        ...opts.headers,
      },
      body: JSON.stringify(body),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        } else if (
          response.headers.get("Content-Type")?.startsWith("application/json")
        ) {
          return response.json() as RESP;
        } else {
          return null as RESP;
        }
      })
      .catch((error) => {
        // Catch and rethrow
        Logger.error(`Error requesting ${fullUrl}`, error);
        throw error;
      });
  },
  sse<RES>(
    url: string,
    {
      handleMessage,
      handleResult,
    }: {
      handleMessage: (data: string) => void;
      handleResult: (result: RES) => void;
    },
    base_url: string | null = null,
  ) {
    base_url = base_url ?? `${document.baseURI}api`;
    const fullUrl = base_url + url;
    let sseSource = new EventSource(fullUrl);

    /*
     * Listen for result events similar to the following:
     *
     * event: result
     * data: JSON of type RES
     */
    sseSource.addEventListener("result", (e) => {
      handleResult(JSON.parse(e.data) as RES);
    });
    /**
     * Any other events will be passed to the following
     */
    sseSource.addEventListener("message", (e) => {
      handleMessage(e.data);
    });
  },
  headers() {
    return {
      "Marimo-Session-Id": getSessionId(),
      "Marimo-Server-Token": getServerTokenOnce(),
    };
  },
};
