/* Copyright 2024 Marimo. All rights reserved. */
import { RuntimeState } from "@/core/kernel/RuntimeState";
import { CellId } from "@/core/cells/ids";
import { sendRun } from "@/core/network/requests";
import { staleCellIds, useNotebook } from "@/core/cells/cells";
import { derefNotNull } from "@/utils/dereference";
import useEvent from "react-use-event-hook";
import { getEditorCodeAsPython } from "@/core/codemirror/language/utils";
import { Logger } from "@/utils/Logger";
import { RuntimeMode, getRuntimeMode } from "@/utils/runtimeMode";
import { CompilationHandlers } from "@/core/network/types";
import { useCompilation } from "@/core/workers/runtime/compilation";

/**
 * Creates a function that runs all cells that have been edited or interrupted.
 */
export function useRunStaleCells() {
  const notebook = useNotebook();
  const runCells = useRunCells();
  const runStaleCells = useEvent(() => runCells(staleCellIds(notebook)));
  return runStaleCells;
}

/**
 * Creates a function that runs the cell with the given id.
 */
export function useRunCell(cellId: CellId | undefined) {
  const runCells = useRunCells();
  const runCell = useEvent(() => {
    if (cellId === undefined) {
      return;
    }
    runCells([cellId]);
  });
  return runCell;
}

/**
 * Creates a function that runs the given cells.
 */
function useRunCells() {
  const notebook = useNotebook();

  let compilationHandlers: CompilationHandlers | null = null;
  if (getRuntimeMode() == RuntimeMode.Workers) {
    compilationHandlers = useCompilation().handlers;
  }

  const runCells = useEvent(async (cellIds: CellId[]) => {
    if (cellIds.length === 0) {
      return;
    }

    const { cellHandles } = notebook;

    const codes: string[] = [];
    for (const cellId of cellIds) {
      const ref = derefNotNull(cellHandles[cellId]);
      codes.push(getEditorCodeAsPython(ref.editorView));
      ref.registerRun();
    }

    RuntimeState.INSTANCE.registerRunStart();
    await sendRun(cellIds, codes, compilationHandlers).catch((error) => {
      Logger.error(error);
      RuntimeState.INSTANCE.registerRunEnd();
    });
  });

  return runCells;
}
