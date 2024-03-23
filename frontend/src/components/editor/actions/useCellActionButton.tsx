/* Copyright 2024 Marimo. All rights reserved. */
import { downloadCellOutput } from "@/components/export/export-output-button";
import { Switch } from "@/components/ui/switch";
import { formatEditorViews } from "@/core/codemirror/format";
import { useCellActions, useSetDefaultWorkerIfEmpty } from "@/core/cells/cells";
import {
  ImageIcon,
  Code2Icon,
  CloudLightning,
  ZapIcon,
  PlusCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronsUpIcon,
  ChevronsDownIcon,
  Trash2Icon,
  ZapOffIcon,
  PlayIcon,
  TextCursorInputIcon,
  EyeIcon,
  EyeOffIcon,
  SparklesIcon,
} from "lucide-react";
import { ActionButton } from "./types";
import { MultiIcon } from "@/components/icons/multi-icon";
import { CellConfig, CellData, CellStatus } from "@/core/cells/types";
import { CellId } from "@/core/cells/ids";
import { saveCellConfig } from "@/core/network/requests";
import { EditorView } from "@codemirror/view";
import { useRunCell } from "../cell/useRunCells";
import { NameCellInput } from "./name-cell-input";
import { getFeatureFlag } from "@/core/config/feature-flag";
import { useSetAtom } from "jotai";
import { aiCompletionCellAtom } from "@/core/ai/state";
import { useImperativeModal } from "@/components/modal/ImperativeModal";
import {
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { WorkerDropdown } from "./worker-dropdown";
import { useConnectedWorkers, useDefaultWorkerUrl } from "@/core/workers/state";

export interface CellActionButtonProps
  extends Pick<CellData, "name" | "config"> {
  cellId: CellId;
  status: CellStatus;
  workerUrl: string | null;
  editorView: EditorView | null;
  hasOutput: boolean;
}

interface Props {
  cell: CellActionButtonProps | null;
}

export function useCellActionButtons({ cell }: Props) {
  const {
    createNewCell: createCell,
    updateCellConfig,
    updateCellCode,
    updateCellName,
    updateCellWorker,
    deleteCell,
    moveCell,
    sendToTop,
    sendToBottom,
  } = useCellActions();
  const runCell = useRunCell(cell?.cellId);
  const { openModal } = useImperativeModal();
  const setAiCompletionCell = useSetAtom(aiCompletionCellAtom);
  const connectedWorkers = useConnectedWorkers();
  const defaultWorkerUrl = useDefaultWorkerUrl();

  // Assign a default worker to the cells if possible
  useSetDefaultWorkerIfEmpty();

  if (!cell) {
    return [];
  }
  const { cellId, config, editorView, name, hasOutput, status, workerUrl } =
    cell;

  const toggleDisabled = async () => {
    const newConfig = { disabled: !config.disabled };
    await saveCellConfig({ configs: { [cellId]: newConfig } });
    updateCellConfig({ cellId, config: newConfig });
  };

  const toggleHideCode = async () => {
    const newConfig: CellConfig = { hide_code: !config.hide_code };
    await saveCellConfig({ configs: { [cellId]: newConfig } });
    updateCellConfig({ cellId, config: newConfig });

    // If we're hiding the code, we should blur the editor
    // otherwise, we should focus it
    if (editorView) {
      if (newConfig.hide_code) {
        editorView.contentDOM.blur();
      } else {
        editorView.focus();
      }
    }
  };

  // Actions
  const actions: ActionButton[][] = [
    [
      {
        icon: <TextCursorInputIcon size={13} strokeWidth={1.5} />,
        label: "Name",
        disableClick: true,
        handle: (evt) => {
          evt?.stopPropagation();
          evt?.preventDefault();
        },
        handleHeadless: () => {
          openModal(
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename cell</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-between">
                <Label htmlFor="cell-name">Cell name</Label>
                <NameCellInput
                  placeholder={`cell_${cellId}`}
                  value={name}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      openModal(null);
                    }
                  }}
                  onChange={(newName) =>
                    updateCellName({ cellId, name: newName })
                  }
                />
              </div>
            </DialogContent>,
          );
        },
        rightElement: (
          <NameCellInput
            placeholder={`cell_${cellId}`}
            value={name}
            onChange={(newName) => updateCellName({ cellId, name: newName })}
          />
        ),
      },
      {
        icon: <CloudLightning size={13} strokeWidth={1.5} />,
        label: "Cell worker",
        disableClick: true,
        handle: (evt) => {
          evt?.stopPropagation();
          evt?.preventDefault();
        },
        rightElement: workerUrl ? (
          <WorkerDropdown
            value={workerUrl}
            options={connectedWorkers}
            onChange={(newUrl) => {
              updateCellWorker({ cellId, workerUrl: newUrl });
            }}
          />
        ) : (
          <span className="text-red-300 italic">no connected worker</span>
        ),
      },
      {
        icon: <PlayIcon size={13} strokeWidth={1.5} />,
        label: "Run cell",
        hotkey: "cell.run",
        hidden:
          status === "running" ||
          status === "queued" ||
          status === "disabled-transitively" ||
          config.disabled === true,
        handle: () => runCell(),
      },
      {
        icon: <SparklesIcon size={13} strokeWidth={1.5} />,
        label: "AI completion",
        hidden: !getFeatureFlag("ai"),
        handle: () => {
          setAiCompletionCell((current) =>
            current === cellId ? null : cellId,
          );
        },
        hotkey: "cell.aiCompletion",
      },
      {
        icon: <ImageIcon size={13} strokeWidth={1.5} />,
        label: "Export output as PNG",
        hidden: !hasOutput,
        handle: () => downloadCellOutput(cellId),
      },
      {
        icon: <Code2Icon size={13} strokeWidth={1.5} />,
        label: "Format cell",
        hotkey: "cell.format",
        handle: () => {
          if (!editorView) {
            return;
          }
          formatEditorViews({ [cellId]: editorView }, updateCellCode);
        },
      },
      {
        icon: config.hide_code ? (
          <EyeIcon size={13} strokeWidth={1.5} />
        ) : (
          <EyeOffIcon size={13} strokeWidth={1.5} />
        ),
        label: config.hide_code === true ? "Show code" : "Hide code",
        handle: toggleHideCode,
        hotkey: "cell.hideCode",
      },
      {
        icon: config.disabled ? (
          <ZapIcon size={13} strokeWidth={1.5} />
        ) : (
          <ZapOffIcon size={13} strokeWidth={1.5} />
        ),
        label: config.disabled === true ? "Enable cell" : "Disable cell",
        rightElement: (
          <Switch
            data-testid="cell-disable-switch"
            checked={!config.disabled}
            size="sm"
            onCheckedChange={toggleDisabled}
          />
        ),
        handle: toggleDisabled,
      },
    ],

    // Movement
    [
      {
        icon: (
          <MultiIcon>
            <PlusCircleIcon size={13} strokeWidth={1.5} />
            <ChevronUpIcon size={8} strokeWidth={2} />
          </MultiIcon>
        ),
        label: "Create cell above",
        hotkey: "cell.createAbove",
        handle: () =>
          createCell({
            cellId,
            before: true,
            defaultWorkerUrl,
          }),
      },
      {
        icon: (
          <MultiIcon>
            <PlusCircleIcon size={13} strokeWidth={1.5} />
            <ChevronDownIcon size={8} strokeWidth={2} />
          </MultiIcon>
        ),
        label: "Create cell below",
        hotkey: "cell.createBelow",
        handle: () =>
          createCell({
            cellId,
            before: false,
            defaultWorkerUrl,
          }),
      },
      {
        icon: <ChevronUpIcon size={13} strokeWidth={1.5} />,
        label: "Move cell up",
        hotkey: "cell.moveUp",
        handle: () => moveCell({ cellId, before: true }),
      },
      {
        icon: <ChevronDownIcon size={13} strokeWidth={1.5} />,
        label: "Move cell down",
        hotkey: "cell.moveDown",
        handle: () => moveCell({ cellId, before: false }),
      },
      {
        icon: <ChevronsUpIcon size={13} strokeWidth={1.5} />,
        label: "Send to top",
        hotkey: "cell.sendToTop",
        handle: () => sendToTop({ cellId }),
      },
      {
        icon: <ChevronsDownIcon size={13} strokeWidth={1.5} />,
        label: "Send to bottom",
        hotkey: "cell.sendToBottom",
        handle: () => sendToBottom({ cellId }),
      },
    ],

    // Delete
    [
      {
        label: "Delete",
        variant: "danger",
        icon: <Trash2Icon size={13} strokeWidth={1.5} />,
        handle: () => deleteCell({ cellId }),
      },
    ],
  ];

  // remove hidden
  return actions
    .map((group) => group.filter((action) => !action.hidden))
    .filter((group) => group.length > 0);
}
