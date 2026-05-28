import { useEffect, useMemo, useRef, useState } from "react";
import { mediaUrl, type ReferenceItem, type ActivityListItem, patchNode } from "../api/client";
import { useBoardStore } from "../store/board";
import { filterReferences, useReferencesStore } from "../store/references";
import { useGenerationStore } from "../store/generation";

/**
 * Right-side collapsible reference library.
 *
 * The panel renders a vertical list of saved references — each card is
 * a 64x64 thumbnail + label + shortId tag with hover-revealed actions
 * (pin toggle, rename in-place, delete with confirm). Cards are both
 * clickable (Phase 3 will wire spawn-at-canvas-center) and draggable
 * with a custom `application/x-flowboard-reference` MIME so canvas
 * drop handlers can detect the payload without colliding with the
 * existing file-upload drop path.
 *
 * A fixed-position vertical ★ tab on the right edge toggles the open
 * state, which is persisted to localStorage by the store.
 */
export function ReferencesPanel() {
  const items = useReferencesStore((s) => s.items);
  const loading = useReferencesStore((s) => s.loading);
  const error = useReferencesStore((s) => s.error);
  const panelOpen = useReferencesStore((s) => s.panelOpen);
  const query = useReferencesStore((s) => s.query);
  const setQuery = useReferencesStore((s) => s.setQuery);
  const togglePanel = useReferencesStore((s) => s.togglePanel);
  const remove = useReferencesStore((s) => s.remove);
  const rename = useReferencesStore((s) => s.rename);
  const togglePin = useReferencesStore((s) => s.togglePin);

  const [activeTab, setActiveTab] = useState<"library" | "history">("library");
  const [historyItems, setHistoryItems] = useState<ActivityListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const filtered = useMemo(() => filterReferences(items, query), [items, query]);

  const fetchHistory = () => {
    if (!panelOpen || activeTab !== "history") return;
    setHistoryLoading(true);
    import("../api/client").then(({ getActivityList }) => {
      getActivityList({ limit: 50, type: ["gen_image", "gen_video", "edit_image"] })
        .then((res) => {
          setHistoryItems(res.items || []);
        })
        .catch((err) => {
          console.error("Failed to load history items", err);
        })
        .finally(() => {
          setHistoryLoading(false);
        });
    });
  };

  useEffect(() => {
    fetchHistory();
  }, [panelOpen, activeTab]);

  return (
    <>
      <button
        type="button"
        className="references-panel__toggle-tab"
        onClick={togglePanel}
        aria-label={panelOpen ? "Collapse references" : "Open references"}
        title={panelOpen ? "Collapse library" : "Open library"}
      >
        <span aria-hidden="true">{panelOpen ? "›" : "★"}</span>
      </button>
      <aside
        className={`references-panel${
          panelOpen ? " references-panel--open" : " references-panel--collapsed"
        }`}
        aria-hidden={!panelOpen}
      >
        <div className="references-panel__header">
          <span className="references-panel__title">
            <span aria-hidden="true">★</span> Workspace
          </span>
          <button
            type="button"
            className="references-panel__close"
            onClick={togglePanel}
            aria-label="Collapse references panel"
            title="Collapse"
          >
            ›
          </button>
        </div>

        {/* Tab switcher */}
        <div className="references-panel__tabs" style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--panel)" }}>
          <button
            type="button"
            className={`references-panel__tab ${activeTab === "library" ? "references-panel__tab--active" : ""}`}
            style={{
              flex: 1,
              padding: "10px 4px",
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: activeTab === "library" ? "var(--accent)" : "var(--muted)",
              background: "none",
              border: "none",
              borderBottom: activeTab === "library" ? "2px solid var(--accent)" : "2px solid transparent",
              cursor: "pointer",
              transition: "all 0.12s ease"
            }}
            onClick={() => setActiveTab("library")}
          >
            Library
          </button>
          <button
            type="button"
            className={`references-panel__tab ${activeTab === "history" ? "references-panel__tab--active" : ""}`}
            style={{
              flex: 1,
              padding: "10px 4px",
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: activeTab === "history" ? "var(--accent)" : "var(--muted)",
              background: "none",
              border: "none",
              borderBottom: activeTab === "history" ? "2px solid var(--accent)" : "2px solid transparent",
              cursor: "pointer",
              transition: "all 0.12s ease"
            }}
            onClick={() => setActiveTab("history")}
          >
            🕒 History
          </button>
        </div>

        {activeTab === "library" ? (
          <>
            <div className="references-panel__search">
              <input
                type="text"
                placeholder="🔍 search references…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search references"
              />
            </div>

            {error && <div className="references-panel__error">{error}</div>}

            {loading && items.length === 0 && (
              <div className="references-panel__empty">Loading…</div>
            )}

            {!loading && items.length === 0 && (
              <div className="references-panel__empty">
                Save a variant from any image node to start your library.
              </div>
            )}

            {!loading && items.length > 0 && filtered.length === 0 && (
              <div className="references-panel__empty">
                No references match "{query}".
              </div>
            )}

            <ul className="references-panel__list">
              {filtered.map((ref) => (
                <ReferenceCard
                  key={ref.id}
                  item={ref}
                  onRename={(label) => rename(ref.id, label)}
                  onTogglePin={() => togglePin(ref.id)}
                  onDelete={() => remove(ref.id)}
                />
              ))}
            </ul>
          </>
        ) : (
          <>
            <div className="references-panel__search" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px" }}>
              <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" }}>Render Sessions</span>
              <button
                type="button"
                onClick={fetchHistory}
                disabled={historyLoading}
                className="cli-reference__copy-btn"
                style={{ padding: "2px 8px", borderRadius: "var(--radius-md)", fontSize: "10px" }}
              >
                {historyLoading ? "..." : "🔄 Refresh"}
              </button>
            </div>

            {historyLoading && historyItems.length === 0 && (
              <div className="references-panel__empty">Loading history…</div>
            )}

            {!historyLoading && historyItems.length === 0 && (
              <div className="references-panel__empty">
                No render history found for this board.
              </div>
            )}

            <ul className="references-panel__list">
              {historyItems.map((item) => (
                <HistoryCard key={item.id} item={item} />
              ))}
            </ul>
          </>
        )}
      </aside>
    </>
  );
}

interface ReferenceCardProps {
  // Named `item` rather than `ref` to avoid React's reserved-prop
  // collision (refs are forwarded via a different prop in React 19+).
  item: ReferenceItem;
  onRename(label: string): Promise<void> | void;
  onTogglePin(): Promise<void> | void;
  onDelete(): Promise<void> | void;
}

function ReferenceCard({
  item,
  onRename,
  onTogglePin,
  onDelete,
}: ReferenceCardProps) {
  const [thumbBroken, setThumbBroken] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(item.label);
  // Inline 2-step delete confirm: first click arms the button (label →
  // "Confirm?", colour shifts to red), second click within 3s commits
  // the DELETE. Anywhere else (timeout, blur, panel scroll) → revert.
  // Replaces the native window.confirm() which was modal + ugly.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-revert the confirm-armed state after 3s of no second click.
    return () => {
      if (confirmTimerRef.current !== null) {
        clearTimeout(confirmTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (renaming) {
      setDraft(item.label);
      setTimeout(() => inputRef.current?.select(), 20);
    }
  }, [renaming, item.label]);

  function handleDragStart(e: React.DragEvent<HTMLLIElement>) {
    const payload = {
      mediaId: item.mediaId,
      aiBrief: item.aiBrief,
      aspectRatio: item.aspectRatio,
      kind: item.kind,
      label: item.label,
    };
    e.dataTransfer.setData(
      "application/x-flowboard-reference",
      JSON.stringify(payload),
    );
    e.dataTransfer.effectAllowed = "copy";
  }

  async function handleClick() {
    // Click-to-spawn: drop a new visual_asset node onto the canvas at a
    // fixed fallback position. A future polish pass can pipe in the real
    // canvas center via ReactFlow's screenToFlowPosition once it's
    // exposed outside <ReactFlow> (this component lives outside that
    // subtree, so we don't have access to the hook here).
    const pos = { x: 200, y: 200 };
    await useBoardStore.getState().addReferenceNode(
      {
        mediaId: item.mediaId,
        aiBrief: item.aiBrief,
        aspectRatio: item.aspectRatio,
        kind: item.kind,
        label: item.label,
      },
      pos,
    );
  }

  async function commitRename() {
    const next = draft.trim();
    setRenaming(false);
    if (!next || next === item.label) return;
    try {
      await onRename(next);
    } catch {
      // Swallow — surface via store.error already.
    }
  }

  function armDeleteConfirm() {
    setConfirmDelete(true);
    if (confirmTimerRef.current !== null) {
      clearTimeout(confirmTimerRef.current);
    }
    confirmTimerRef.current = setTimeout(() => {
      setConfirmDelete(false);
      confirmTimerRef.current = null;
    }, 3000);
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    // First click: arm the confirm (visual red + label change). Second
    // click within 3s commits. Timeout → revert.
    if (!confirmDelete) {
      armDeleteConfirm();
      return;
    }
    if (confirmTimerRef.current !== null) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
    setDeleting(true);
    try {
      await onDelete();
      // The card unmounts on success — no need to flip state back.
    } catch {
      // Swallow — surfaced via store.error. Revert UI so the user can
      // retry or move on.
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  // Short id derived from sourceNodeShortId if present; otherwise show
  // the numeric ref id. Provenance-first because users tend to scan the
  // panel by "which node was this from?".
  const shortIdTag = item.sourceNodeShortId
    ? `#${item.sourceNodeShortId}`
    : `#${item.id}`;

  const tooltip = item.aiBrief
    ? `${item.label}\n\n${item.aiBrief}`
    : item.label;

  return (
    <li
      className="reference-card"
      draggable
      onDragStart={handleDragStart}
      onClick={() => {
        void handleClick();
      }}
      title={tooltip}
    >
      <div className="reference-card__thumb">
        {thumbBroken ? (
          <div className="reference-card__thumb-missing" aria-hidden="true">
            📷
          </div>
        ) : (
          <img
            src={mediaUrl(item.mediaId)}
            alt=""
            onError={() => setThumbBroken(true)}
            draggable={false}
          />
        )}
      </div>

      <div className="reference-card__body">
        {renaming ? (
          <input
            ref={inputRef}
            className="reference-card__rename-input"
            value={draft}
            maxLength={120}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setRenaming(false);
                setDraft(item.label);
              }
            }}
          />
        ) : (
          <span className="reference-card__label">{item.label}</span>
        )}
        <span className="reference-card__id">{shortIdTag}</span>
      </div>

      <div className="reference-card__actions">
        <button
          type="button"
          className={`reference-card__action-btn${
            item.pinned ? " reference-card__action-btn--active" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          aria-label={item.pinned ? "Unpin reference" : "Pin reference"}
          title={item.pinned ? "Unpin" : "Pin to top"}
        >
          {item.pinned ? "★" : "☆"}
        </button>
        <button
          type="button"
          className="reference-card__action-btn"
          onClick={(e) => {
            e.stopPropagation();
            setRenaming(true);
          }}
          aria-label="Rename reference"
          title="Rename"
        >
          ✎
        </button>
        <button
          type="button"
          className={
            "reference-card__action-btn reference-card__action-btn--danger"
            + (confirmDelete ? " reference-card__action-btn--armed" : "")
          }
          onClick={handleDelete}
          disabled={deleting}
          aria-label={
            confirmDelete
              ? "Confirm delete reference"
              : "Delete reference"
          }
          title={
            confirmDelete
              ? "Click again to confirm — auto-cancels in 3s"
              : "Delete (underlying image stays in storage)"
          }
        >
          {deleting ? "…" : confirmDelete ? "Confirm?" : "🗑"}
        </button>
      </div>
    </li>
  );
}

interface HistoryCardProps {
  item: ActivityListItem;
}

function HistoryCard({ item }: HistoryCardProps) {
  const [thumbBroken, setThumbBroken] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Extract mediaId from result
  const mediaIds: string[] = item.result?.media_ids || (item.result?.media_id ? [item.result.media_id] : []);
  const mediaId = item.result?.media_id || mediaIds[0];

  const hasMedia = !!mediaId && item.status === "done";
  const promptText = item.params?.prompt || "";
  const shortIdTag = item.node_short_id ? `#${item.node_short_id}` : `#${item.id}`;
  
  // Format dates
  const formattedTime = useMemo(() => {
    if (!item.created_at) return "";
    try {
      const d = new Date(item.created_at);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "";
    }
  }, [item.created_at]);

  async function handleApply() {
    if (!item.node_id || !mediaId) return;
    setRestoring(true);
    try {
      // 1. Update store
      useBoardStore.getState().updateNodeData(String(item.node_id), {
        mediaId,
        mediaIds,
        variantCount: mediaIds.length,
        status: "done"
      });

      // 2. Patch database
      await patchNode(item.node_id, {
        status: "done",
        data: {
          mediaId,
          mediaIds,
          variantCount: mediaIds.length,
          renderedAt: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error("Failed to restore variant to canvas node", err);
      alert("Failed to apply history variant to node");
    } finally {
      setRestoring(false);
    }
  }

  function handleRegenerate(e: React.MouseEvent) {
    e.stopPropagation();
    if (!item.node_id) return;
    useGenerationStore.getState().openGenerationDialog(String(item.node_id), promptText);
  }

  function handleViewLarge(e: React.MouseEvent) {
    e.stopPropagation();
    if (!item.node_id) return;
    // Find visual variant index in node's mediaIds, defaults to 0
    const varIdx = mediaIds.indexOf(mediaId);
    useGenerationStore.getState().openResultViewer(String(item.node_id), varIdx >= 0 ? varIdx : 0);
  }

  const tooltip = `${promptText}\n\nStatus: ${item.status}\nTime: ${formattedTime}`;

  return (
    <li
      className="reference-card"
      style={{ opacity: item.status === "failed" ? 0.6 : 1 }}
      title={tooltip}
      onClick={(e) => {
        if (hasMedia) handleViewLarge(e);
      }}
    >
      <div className="reference-card__thumb" style={{ background: item.status === "failed" ? "rgba(239, 68, 68, 0.1)" : "var(--panel-higher)" }}>
        {!hasMedia || thumbBroken ? (
          <div className="reference-card__thumb-missing" style={{ fontSize: "14px" }} aria-hidden="true">
            {item.status === "running" ? "⚙️" : item.status === "failed" ? "❌" : "📷"}
          </div>
        ) : (
          <img
            src={mediaUrl(mediaId)}
            alt=""
            onError={() => setThumbBroken(true)}
            draggable={false}
          />
        )}
      </div>

      <div className="reference-card__body">
        <span className="reference-card__label" style={{ fontStyle: !promptText ? "italic" : "normal", color: !promptText ? "var(--muted)" : "var(--text)" }}>
          {promptText || (item.type === "gen_video" ? "Video Generation" : "Image Generation")}
        </span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px" }}>
          <span className="reference-card__id">{shortIdTag}</span>
          <span style={{ fontSize: "10px", color: "var(--muted)" }}>{formattedTime}</span>
          {item.status === "running" && (
            <span style={{ fontSize: "10px", color: "var(--accent)", fontWeight: 500 }}>Running…</span>
          )}
        </div>
      </div>

      <div className="reference-card__actions">
        {hasMedia && (
          <button
            type="button"
            className="reference-card__action-btn"
            onClick={(e) => {
              e.stopPropagation();
              void handleApply();
            }}
            disabled={restoring}
            title="Apply this render back to node"
            aria-label="Apply render"
            style={{ color: "var(--success)" }}
          >
            {restoring ? "…" : "↩"}
          </button>
        )}
        {item.node_id && (
          <button
            type="button"
            className="reference-card__action-btn"
            onClick={handleRegenerate}
            title="Fill prompt & settings to regenerate"
            aria-label="Regenerate"
          >
            🔁
          </button>
        )}
      </div>
    </li>
  );
}
