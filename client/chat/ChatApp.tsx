import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Square,
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
  Sparkles,
  Download,
  Code2,
  PenLine,
  Lightbulb,
  Compass,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Sun,
  Moon,
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BrowserEngine, type EngineEvent } from "./engine";
import {
  STORAGE_KEY,
  MAX_CHATS,
  MAX_MESSAGES,
  MAX_PROMPT,
  restore,
  persist,
  createConversation,
  modelContext,
  titleFor,
  type ChatState,
  type ChatMessage,
} from "./state";
import "./chat.css";
const prompts = [
  {
    icon: PenLine,
    title: "Schrijf iets moois",
    text: "Help me een vriendelijke e-mail schrijven om iemand te bedanken.",
  },
  {
    icon: Lightbulb,
    title: "Maak het begrijpelijk",
    text: "Leg in eenvoudige woorden uit waarom de lucht blauw is.",
  },
  {
    icon: Code2,
    title: "Denk mee over code",
    text: "Laat een eenvoudige JavaScript-functie zien die twee getallen optelt.",
  },
  {
    icon: Compass,
    title: "Geef mijn dag richting",
    text: "Geef drie praktische tips om mijn dag beter te plannen.",
  },
];
type Phase = "idle" | "loading" | "generating";
export function ChatApp() {
  const [state, setState] = useState<ChatState>(() => {
    try {
      return restore(localStorage.getItem(STORAGE_KEY));
    } catch {
      return restore(null);
    }
  });
  const [draft, setDraft] = useState(""),
    [phase, setPhase] = useState<Phase>("idle"),
    [ready, setReady] = useState(false),
    [progress, setProgress] = useState<number | null>(null),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [menu, setMenu] = useState(false),
    [settings, setSettings] = useState(false),
    [rename, setRename] = useState<string | null>(null),
    [deleteId, setDeleteId] = useState<string | true | null>(null),
    [toast, setToast] = useState(""),
    [storageFailed, setStorageFailed] = useState(false);
  const engine = useRef<BrowserEngine | null>(null),
    job = useRef<{ id: string; chat: string; reply: string } | null>(null),
    phaseRef = useRef<Phase>("idle"),
    end = useRef<HTMLDivElement | null>(null);
  phaseRef.current = phase;
  const active = state.chats.find((c) => c.id === state.active);
  const modalOpen = settings || rename !== null || deleteId !== null;
  const modalKind = settings
    ? "settings"
    : rename !== null
      ? "rename"
      : deleteId !== null
        ? "delete"
        : null;
  const otherTabBusy =
    phase === "idle" && active?.messages.at(-1)?.status === "streaming";
  const externalUpdate = useRef(false),
    lastSaved = useRef(JSON.stringify(state));
  const updateReply = (
    chatId: string,
    replyId: string,
    update: (m: ChatMessage) => ChatMessage,
  ) =>
    setState((s) => ({
      ...s,
      chats: s.chats.map((c) =>
        c.id === chatId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === replyId ? update(m) : m,
              ),
            }
          : c,
      ),
    }));
  useEffect(() => {
    const receive = (event: EngineEvent) => {
      if (event.type === "progress") {
        setStatus(event.text || "Model laden");
        setProgress(event.progress ?? null);
      }
      if (event.type === "ready") {
        setReady(true);
        setProgress(null);
        setStatus("");
        if (job.current) setPhase("generating");
        else setPhase("idle");
      }
      if (event.type === "token" && job.current?.id === event.id) {
        const current = job.current;
        updateReply(current.chat, current.reply, (m) => ({
          ...m,
          content: m.content + (event.text || ""),
        }));
      }
      if (event.type === "done" && job.current?.id === event.id) {
        const current = job.current;
        updateReply(current.chat, current.reply, (m) => ({
          ...m,
          status: "complete",
        }));
        job.current = null;
        setPhase("idle");
      }
      if (event.type === "error") {
        if (job.current?.id === event.id) {
          const current = job.current;
          updateReply(current.chat, current.reply, (m) => ({
            ...m,
            status: "error",
          }));
          job.current = null;
        }
        setError(
          "De AI kon niet antwoorden. Controleer je verbinding en beschikbare geheugen, en probeer opnieuw.",
        );
        setPhase("idle");
        setReady(false);
        setStatus("");
        setProgress(null);
        engine.current?.stop();
      }
    };
    engine.current = new BrowserEngine(receive);
    return () => {
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    const serialized = JSON.stringify(state),
      skip = externalUpdate.current;
    externalUpdate.current = false;
    if (serialized === lastSaved.current) return;
    lastSaved.current = serialized;
    if (skip) return;
    try {
      setStorageFailed(!persist(state, localStorage));
    } catch {
      setStorageFailed(true);
    }
  }, [state]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      const incoming = restore(event.newValue, true),
        current = job.current;
      externalUpdate.current = !current;
      if (current) {
        engine.current?.stop();
        job.current = null;
        phaseRef.current = "idle";
        setPhase("idle");
        setReady(false);
        setStatus("");
        setProgress(null);
        for (const chat of incoming.chats)
          if (chat.id === current.chat)
            chat.messages = chat.messages.map((m) =>
              m.id === current.reply ? { ...m, status: "stopped" } : m,
            );
        setToast("Genereren gestopt door een wijziging in een ander tabblad.");
      }
      setState(incoming);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "instant", block: "end" });
  }, [active?.messages.at(-1)?.content, phase]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSettings(false);
        setMenu(false);
        setRename(null);
        setDeleteId(null);
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,a[href]",
        ) || [],
      );
    const elements = focusable();
    (dialog?.querySelector<HTMLElement>("input") || elements[0])?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const nodes = focusable(),
        first = nodes[0],
        last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [modalKind]);
  const stop = () => {
    engine.current?.stop();
    if (job.current) {
      const current = job.current;
      updateReply(current.chat, current.reply, (m) => ({
        ...m,
        status: "stopped",
      }));
      job.current = null;
    }
    phaseRef.current = "idle";
    if (otherTabBusy && active) {
      const reply = active.messages.at(-1);
      if (reply)
        updateReply(active.id, reply.id, (m) => ({ ...m, status: "stopped" }));
    }
    setPhase("idle");
    setReady(false);
    setProgress(null);
    setStatus("");
  };
  const select = (id: string | null) => {
    if (phaseRef.current !== "idle" || otherTabBusy) stop();
    setState((s) => ({ ...s, active: id }));
    setDraft("");
    setError("");
    setMenu(false);
  };
  const newChat = () => select(null);
  const send = (text = draft, retry = false) => {
    if (
      phaseRef.current !== "idle" ||
      otherTabBusy ||
      !text.trim() ||
      text.length > MAX_PROMPT
    )
      return;
    phaseRef.current = ready ? "generating" : "loading";
    const chat = active || createConversation();
    const user: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      status: "complete",
    };
    const messages = retry
      ? chat.messages.slice(0, -1)
      : [...chat.messages, user];
    const reply: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      status: "streaming",
    };
    const next = {
      ...chat,
      title: chat.messages.length ? chat.title : titleFor(text),
      messages: [...messages, reply].slice(-MAX_MESSAGES),
    };
    setState((s) => ({
      ...s,
      active: chat.id,
      chats: [next, ...s.chats.filter((c) => c.id !== chat.id)].slice(
        0,
        MAX_CHATS,
      ),
    }));
    setDraft("");
    setError("");
    setPhase(ready ? "generating" : "loading");
    setProgress(null);
    setStatus("Model laden");
    try {
      const id = engine.current!.generate(modelContext(messages));
      job.current = { id, chat: chat.id, reply: reply.id };
    } catch {
      setPhase("idle");
      setError(
        "Deze browser ondersteunt de AI-worker niet. Probeer een recente browser.",
      );
      updateReply(chat.id, reply.id, (m) => ({ ...m, status: "error" }));
    }
  };
  const load = () => {
    if (phaseRef.current !== "idle") return;
    phaseRef.current = "loading";
    setError("");
    setPhase("loading");
    setProgress(null);
    setStatus("Model ophalen");
    try {
      engine.current!.load();
    } catch {
      setError("Deze browser ondersteunt de AI-worker niet.");
      phaseRef.current = "idle";
      setPhase("idle");
    }
  };
  const retry = () => {
    const messages = active?.messages;
    if (!messages) return;
    const lastUser = messages.at(-2);
    if (lastUser?.role === "user") send(lastUser.content, true);
    else load();
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Antwoord gekopieerd");
    } catch {
      setToast("Kopiëren is niet beschikbaar in deze browser.");
    }
  };
  const exportChats = () => {
    const blob = new Blob([JSON.stringify(state.chats, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flowchat-gesprekken.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="chat-shell">
      {menu && (
        <button
          className="sidebar-overlay"
          aria-label="Menu sluiten"
          onClick={() => setMenu(false)}
        />
      )}
      <aside
        inert={modalOpen}
        className={"chat-sidebar" + (menu ? " open" : "")}
      >
        <div className="sidebar-brand">
          <a
            href={import.meta.env.BASE_URL}
            onClick={(e) => {
              e.preventDefault();
              newChat();
            }}
          >
            <span className="flow-icon">
              <Sparkles size={19} />
            </span>
            FlowChat<span className="brand-dot">.</span>
          </a>
          <button
            className="icon-button close-sidebar"
            aria-label="Menu sluiten"
            onClick={() => setMenu(false)}
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
        <button className="new-chat" onClick={newChat}>
          <Plus size={18} />
          Nieuw gesprek<span>↗</span>
        </button>
        <div className="history-label">
          JE GESPREKKEN <span>{state.chats.length}</span>
        </div>
        <nav className="chat-history" aria-label="Gesprekken">
          {state.chats.length ? (
            state.chats.map((c) => (
              <button
                key={c.id}
                className={
                  "history-item" + (c.id === state.active ? " selected" : "")
                }
                onClick={() => select(c.id)}
              >
                <MessageSquare size={16} />
                <span>{c.title}</span>
              </button>
            ))
          ) : (
            <p className="history-empty">
              Je ideeën verdienen een plek.
              <br />
              Je gesprekken verschijnen hier.
            </p>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <ShieldCheck size={18} />
            <div>
              <strong>Jouw gedachten, jouw apparaat</strong>
              <p>Geen account. Geen AI-server.</p>
            </div>
          </div>
          <button
            className="sidebar-setting"
            onClick={() => {
              setSettings(true);
              setMenu(false);
            }}
          >
            <Settings size={18} />
            Instellingen<span aria-hidden="true">⌘</span>
          </button>
          <div className="sidebar-footer">
            <span className="avatar">JIJ</span>
            <div>
              <strong>Jouw werkruimte</strong>
              <span>Gratis · open source</span>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <main inert={modalOpen} className="chat-main">
        <header className="chat-topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Menu openen"
              onClick={() => setMenu(true)}
            >
              <PanelLeftOpen size={20} />
            </button>
            <span className="model-selector">
              FlowChat <ChevronDown size={14} />
            </span>
            <span className="model-tag">LOCAL AI</span>
          </div>
          <div className="topbar-right">
            <span className={"model-status" + (ready ? " is-ready" : "")}>
              <i />
              {ready ? "Model gereed" : "Privé, op je apparaat"}
            </span>
            <button
              className="icon-button"
              aria-label={
                state.theme === "dark" ? "Licht thema" : "Donker thema"
              }
              onClick={() =>
                setState((s) => ({
                  ...s,
                  theme: s.theme === "dark" ? "light" : "dark",
                }))
              }
            >
              {state.theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        <div
          className={
            "chat-scroll" + (!active?.messages.length ? " welcome-scroll" : "")
          }
        >
          {!active?.messages.length ? (
            <section className="chat-welcome">
              <div className="welcome-eyebrow">
                <span className="online-dot" />
                EEN BEETJE RUIMTE VOOR JE IDEEËN
              </div>
              <h1>
                Waar kan ik je
                <br />
                <span>mee helpen?</span>
              </h1>
              <p className="welcome-description">
                Een eerste versie. Een frisse blik. Een helder antwoord.
                <br />
                Begin gewoon met wat er in je hoofd zit.
              </p>
              <div className="suggestion-grid">
                {prompts.map((p) => (
                  <button
                    key={p.title}
                    onClick={() => {
                      setDraft(p.text);
                      document.getElementById("chat-input")?.focus();
                    }}
                  >
                    <p.icon size={21} />
                    <strong>{p.title}</strong>
                    <span>
                      Begin een gesprek <ArrowUpRight size={15} />
                    </span>
                  </button>
                ))}
              </div>
              <div className="model-start">
                <span className="start-icon">
                  <Sparkles size={20} />
                </span>
                <div>
                  <strong>Qwen2.5 · lokaal op je apparaat</strong>
                  <p>
                    Eenmalig circa 500 MB downloaden. Daarna worden je berichten
                    lokaal verwerkt.
                  </p>
                </div>
                <button onClick={load} disabled={phase !== "idle" || ready}>
                  <Download size={15} />
                  {ready ? "Model gereed" : "Download AI-model"}
                </button>
              </div>
            </section>
          ) : (
            <section className="messages" aria-label="Chatberichten">
              <div className="conversation-heading">
                <h1>{active.title}</h1>
                <div>
                  <button
                    className="icon-button"
                    aria-label="Gesprek hernoemen"
                    onClick={() => setRename(active.title)}
                  >
                    <PenLine size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Gesprek verwijderen"
                    onClick={() => setDeleteId(active.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {active.messages.map((m) => (
                <article
                  key={m.id}
                  className={"message " + m.role}
                  aria-label={
                    m.role === "user" ? "Jouw bericht" : "AI-antwoord"
                  }
                >
                  {m.role === "assistant" && (
                    <span className="assistant-avatar">
                      <Sparkles size={17} />
                    </span>
                  )}
                  <div className="message-body">
                    {m.role === "user" ? (
                      <p>{m.content}</p>
                    ) : (
                      <>
                        <div className="markdown">
                          <Markdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              img: (props) => (
                                <span>
                                  [Afbeelding: {props.alt || "niet geladen"}]
                                </span>
                              ),
                              a: (props) => (
                                <a
                                  {...props}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                />
                              ),
                            }}
                          >
                            {m.content}
                          </Markdown>
                          {!m.content && m.status === "streaming" && (
                            <span className="thinking-dots">
                              <i />
                              <i />
                              <i />
                            </span>
                          )}
                        </div>
                        {m.status === "stopped" && (
                          <p className="reply-state">
                            Gestopt
                            {!m.content ? " voordat er een antwoord was." : "."}
                          </p>
                        )}
                        {m.status === "error" && (
                          <p className="reply-state">
                            Dit antwoord kon niet worden voltooid.
                          </p>
                        )}
                        {m.status !== "streaming" && (
                          <div className="reply-actions">
                            {m.content && (
                              <button
                                aria-label="Antwoord kopiëren"
                                onClick={() => copy(m.content)}
                              >
                                <Copy size={14} />
                              </button>
                            )}
                            {m.id === active.messages.at(-1)?.id && (
                              <button
                                aria-label="Antwoord opnieuw genereren"
                                disabled={phase !== "idle"}
                                onClick={retry}
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </article>
              ))}
              <div ref={end} />
            </section>
          )}
        </div>
        <div className="composer-area">
          {storageFailed && (
            <div className="chat-alert" role="alert">
              Geschiedenis kon niet worden opgeslagen. Exporteer je gesprekken
              via Instellingen.
            </div>
          )}
          {error && (
            <div className="chat-alert" role="alert">
              <span>{error}</span>
              <button
                onClick={
                  active?.messages.at(-1)?.status === "error" ? retry : load
                }
                disabled={phase !== "idle"}
              >
                Opnieuw proberen
              </button>
            </div>
          )}
          {phase === "loading" && (
            <div className="load-progress" role="status">
              <span>
                {status || "Model laden"}
                {progress !== null ? ` · ${progress}%` : ""}
              </span>
              <span>Je eerste start kan enkele minuten duren.</span>
              {progress !== null && <progress value={progress} max="100" />}
            </div>
          )}
          <form
            className="chat-composer"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              id="chat-input"
              aria-label="Bericht"
              placeholder="Vraag maar raak…"
              rows={2}
              value={draft}
              maxLength={MAX_PROMPT}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  if (phase === "idle") send();
                }
              }}
            />
            <div className="composer-bottom">
              <span>
                <ShieldCheck size={13} />
                {phase === "generating"
                  ? "AI denkt mee…"
                  : "Alleen op jouw apparaat"}
              </span>
              <div>
                {draft.length > 1800 && (
                  <small>
                    {draft.length}/{MAX_PROMPT}
                  </small>
                )}
                {phase !== "idle" || otherTabBusy ? (
                  <button
                    type="button"
                    className="send-button stop"
                    aria-label="Genereren stoppen"
                    onClick={stop}
                  >
                    <Square size={14} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    className="send-button"
                    aria-label="Bericht verzenden"
                    disabled={!draft.trim()}
                  >
                    <ArrowUp size={20} />
                  </button>
                )}
              </div>
            </div>
          </form>
          <p className="composer-disclaimer">
            Een klein open AI-model, geen OpenAI GPT. Antwoorden kunnen fouten
            bevatten. <span>FlowChat · jouw ruimte om te denken</span>
          </p>
        </div>
      </main>
      {settings && (
        <div className="modal-backdrop" onClick={() => setSettings(false)}>
          <section
            className="chat-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Instellingen"
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <h2>Instellingen</h2>
              <button
                className="icon-button"
                aria-label="Instellingen sluiten"
                onClick={() => setSettings(false)}
              >
                <X size={20} />
              </button>
            </header>
            <p className="dialog-description">
              Een rustige werkruimte, op jouw manier.
            </p>
            <h3>Weergave</h3>
            <div className="theme-buttons">
              <button
                className={state.theme === "light" ? "chosen" : ""}
                onClick={() => setState((s) => ({ ...s, theme: "light" }))}
              >
                <Sun size={18} />
                Licht thema
              </button>
              <button
                className={state.theme === "dark" ? "chosen" : ""}
                onClick={() => setState((s) => ({ ...s, theme: "dark" }))}
              >
                <Moon size={18} />
                Donker thema
              </button>
            </div>
            <h3>Gesprekken op dit apparaat</h3>
            <p>
              Maximaal {MAX_CHATS} gesprekken met {MAX_MESSAGES} berichten per
              gesprek. Je gesprekken blijven in deze browser. Gebruik dit niet
              als enige kopie van belangrijke informatie.
            </p>
            <div className="settings-actions">
              <button onClick={exportChats}>
                <Download size={16} />
                Gesprekken exporteren
              </button>
              <button
                className="danger"
                onClick={() => {
                  setDeleteId(true);
                  setSettings(false);
                }}
              >
                <Trash2 size={16} />
                Alles verwijderen
              </button>
            </div>
            <h3>Over de AI</h3>
            <p>
              Qwen2.5-0.5B-Instruct (Apache 2.0) via Transformers.js. De eerste
              download is circa 500 MB; verwerking kan op oudere apparaten traag
              zijn. Geen live internetkennis. Dit is geen OpenAI GPT of ChatGPT.
            </p>
            <p>
              Modelbestanden worden opgehaald bij Hugging Face; die dienst ziet
              je IP-adres bij de download. Je berichten gaan niet naar een
              AI-server. Stoppen onderbreekt ook het downloaden; een volgende
              start kan bestanden opnieuw ophalen.
            </p>
            <p>
              Wis sitegegevens in je browser om ook de modelcache te
              verwijderen.
            </p>
            <a
              className="legacy-link"
              href={import.meta.env.BASE_URL + "legacy/"}
            >
              Open de oorspronkelijke FlowProxy <ArrowUpRight size={14} />
            </a>
          </section>
        </div>
      )}
      {rename !== null && (
        <div className="modal-backdrop">
          <form
            className="chat-dialog compact"
            role="dialog"
            aria-modal="true"
            aria-label="Gesprek hernoemen"
            onSubmit={(e) => {
              e.preventDefault();
              setState((s) => ({
                ...s,
                chats: s.chats.map((c) =>
                  c.id === s.active
                    ? { ...c, title: titleFor(rename || "") }
                    : c,
                ),
              }));
              setRename(null);
            }}
          >
            <header>
              <h2>Gesprek hernoemen</h2>
              <button
                type="button"
                className="icon-button"
                aria-label="Annuleren"
                onClick={() => setRename(null)}
              >
                <X size={18} />
              </button>
            </header>
            <input
              aria-label="Gesprekstitel"
              autoFocus
              maxLength={55}
              value={rename || ""}
              onChange={(e) => setRename(e.target.value)}
            />
            <button className="primary-action" type="submit">
              Opslaan
            </button>
          </form>
        </div>
      )}
      {deleteId && (
        <div className="modal-backdrop">
          <section
            className="chat-dialog compact"
            role="dialog"
            aria-modal="true"
            aria-label="Verwijderen bevestigen"
          >
            <h2>
              {deleteId === true
                ? "Alle gesprekken verwijderen?"
                : "Gesprek verwijderen?"}
            </h2>
            <p>
              Dit verwijdert de lokale geschiedenis. Deze actie kun je niet
              ongedaan maken.
            </p>
            <div className="settings-actions">
              <button onClick={() => setDeleteId(null)}>Annuleren</button>
              <button
                className="danger"
                onClick={() => {
                  stop();
                  setState((s) => ({
                    ...s,
                    chats:
                      deleteId === true
                        ? []
                        : s.chats.filter((c) => c.id !== deleteId),
                    active:
                      deleteId === true || deleteId === s.active
                        ? null
                        : s.active,
                  }));
                  setDeleteId(null);
                  setError("");
                }}
              >
                Verwijderen
              </button>
            </div>
          </section>
        </div>
      )}
      {toast && (
        <div className="chat-toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
