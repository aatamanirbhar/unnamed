import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Provider, Session, User } from "@supabase/supabase-js";
import {
  ArrowRight,
  Check,
  Copy,
  Disc3,
  Eye,
  Globe,
  Inbox,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  Moon,
  RefreshCw,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Stars,
  ThumbsDown,
  ThumbsUp,
  Wand2
} from "lucide-react";
import { backdrops, quotes } from "./lib/assets";
import { getVisitorKeyForSlug } from "./lib/identity";
import { createSlug, normalizeQuestion } from "./lib/slug";
import { getSignUrl, getSiteUrl, isSupabaseConfigured, supabase } from "./lib/supabase";
import type {
  MachineSign,
  MessageRow,
  PublicMessagesPayload,
  PublicQuestionPayload,
  PublicSubmissionPayload,
  Question,
  VoteChoice,
  VoteRow
} from "./types";

const signOptions = [
  {
    label: "Google",
    provider: "google" as Provider,
    className: "social google"
  },
  {
    label: "Discord",
    provider: "discord" as Provider,
    className: "social discord"
  }
];

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [backdropIndex, setBackdropIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex((index) => (index + 1) % quotes.length);
      setBackdropIndex((index) => (index + 1) % backdrops.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handlePop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoadingSession(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoadingSession(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const route = useMemo(() => parseRoute(path), [path]);

  const navigate = useCallback((nextPath: string) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }, []);

  return (
    <div className="app">
      <CosmicBackdrop image={backdrops[backdropIndex].src} />
      <main className="shell">
        {route.kind === "sign" ? (
          <SharedSignPage quote={quotes[quoteIndex]} slug={route.slug} navigate={navigate} />
        ) : route.kind === "expired" ? (
          <ExpiredPage slug={route.slug} navigate={navigate} />
        ) : loadingSession ? (
          <LoadingScreen quote={quotes[quoteIndex]} />
        ) : session ? (
          <Dashboard quote={quotes[quoteIndex]} user={session.user} />
        ) : (
          <Landing quote={quotes[quoteIndex]} />
        )}
      </main>
    </div>
  );
}

function parseRoute(path: string) {
  const parts = path.split("/").filter(Boolean);

  if (parts[0] === "sign" && parts[1]) {
    return { kind: "sign" as const, slug: parts[1] };
  }

  if (parts[0] === "expired" && parts[1]) {
    return { kind: "expired" as const, slug: parts[1] };
  }

  if (parts.length === 1 && isShareSlug(parts[0])) {
    return { kind: "sign" as const, slug: parts[0] };
  }

  return { kind: "home" as const };
}

function isShareSlug(value: string) {
  return /^[a-z0-9-]{8,40}$/i.test(value);
}

function CosmicBackdrop({ image }: { image: string }) {
  return (
    <div className="backdrop" aria-hidden="true">
      <img key={image} src={image} alt="" />
      <div className="backdrop-shade" />
    </div>
  );
}

function Landing({ quote }: { quote: string }) {
  return (
    <section className="home-grid">
      <div className="hero-copy">
        <p className="eyebrow">Omenly</p>
        <h1>Get your sign from the universe.</h1>
        <p>
          Ask the impossible little question, let a private circle vote, or trust the machine for
          an instant yes or no.
        </p>
        <div className="hero-proof">
          <span>
            <ShieldCheck size={16} /> Limited links
          </span>
          <span>
            <MessageCircle size={16} /> Anonymous whispers
          </span>
          <span>
            <Inbox size={16} /> Result email
          </span>
        </div>
      </div>
      <AuthPanel quote={quote} />
    </section>
  );
}

function AuthPanel({ quote }: { quote: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const authClient = isSupabaseConfigured ? supabase : null;

  async function signInWithOAuth(provider: Provider) {
    if (!authClient) {
      setMessage("Add your Supabase URL and anon key to .env.local first.");
      return;
    }

    const { error } = await authClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getSiteUrl()
      }
    });

    if (error) {
      setMessage(error.message);
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!authClient) {
      setMessage("Add your Supabase URL and anon key to .env.local first.");
      return;
    }

    if (password.length < 6) {
      setMessage("Use at least 6 characters for the password.");
      return;
    }

    setBusy(true);

    const action =
      authMode === "signin"
        ? authClient.auth.signInWithPassword({ email, password })
        : authClient.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: getSiteUrl()
            }
          });

    const { error } = await action;
    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      authMode === "signin"
        ? "Welcome back."
        : `Confirmation email sent to ${email}. Check spam or promotions too.`
    );
  }

  return (
    <section className="auth-panel" aria-label="Sign in">
      <div className="panel-topline">
        <Stars size={18} />
        <span>Open your private oracle</span>
      </div>

      <div className="social-row">
        {signOptions.map((option) => (
          <button
            key={option.label}
            className={option.className}
            type="button"
            onClick={() => void signInWithOAuth(option.provider)}
          >
            {option.label === "Discord" ? <Disc3 size={17} /> : <Globe size={17} />}
            {option.label}
          </button>
        ))}
      </div>

      <div className="divider">
        <span>or</span>
      </div>

      <form className="auth-form" onSubmit={(event) => void handleEmailSubmit(event)}>
        <label>
          <span>Email</span>
          <div className="input-wrap">
            <Mail size={18} />
            <input
              required
              type="email"
              placeholder="you@stardust.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </label>

        <label>
          <span>Password</span>
          <div className="input-wrap">
            <KeyRound size={18} />
            <input
              required
              minLength={6}
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        </label>

        <div className="segmented" aria-label="Authentication mode">
          <button
            type="button"
            className={authMode === "signup" ? "active" : ""}
            onClick={() => setAuthMode("signup")}
          >
            Sign up
          </button>
          <button
            type="button"
            className={authMode === "signin" ? "active" : ""}
            onClick={() => setAuthMode("signin")}
          >
            Log in
          </button>
        </div>

        <button className="primary" type="submit" disabled={busy}>
          {busy ? <Loader2 className="spin" size={18} /> : <ArrowRight size={18} />}
          {authMode === "signin" ? "Log in" : "Create account"}
        </button>
      </form>

      {message && <p className="form-note">{message}</p>}
      <p className="rotating-quote">{quote}</p>
    </section>
  );
}

function LoadingScreen({ quote }: { quote: string }) {
  return (
    <section className="center-stage">
      <Loader2 className="spin" size={36} />
      <p>{quote}</p>
    </section>
  );
}

function Dashboard({ user, quote }: { user: User; quote: string }) {
  const [question, setQuestion] = useState("");
  const [limit, setLimit] = useState(7);
  const [machineSign, setMachineSign] = useState<{ answer: VoteChoice; text: string } | null>(null);
  const [shareLink, setShareLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [machineSigns, setMachineSigns] = useState<MachineSign[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const displayName =
    user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Seeker";

  const refreshDashboard = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const [{ data: questionRows }, { data: machineRows }] = await Promise.all([
      supabase
        .from("questions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("machine_signs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6)
    ]);

    const typedQuestions = (questionRows || []) as Question[];
    setQuestions(typedQuestions);
    setMachineSigns((machineRows || []) as MachineSign[]);

    const ids = typedQuestions.map((row) => row.id);
    if (!ids.length) {
      setVotes([]);
      setMessages([]);
      return;
    }

    const [{ data: voteRows }, { data: messageRows }] = await Promise.all([
      supabase.from("votes").select("id, question_id, choice, created_at").in("question_id", ids),
      supabase
        .from("messages")
        .select("id, question_id, body, created_at")
        .in("question_id", ids)
        .order("created_at", { ascending: false })
    ]);

    setVotes((voteRows || []) as VoteRow[]);
    setMessages((messageRows || []) as MessageRow[]);
  }, []);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  async function signOut() {
    await supabase?.auth.signOut();
  }

  async function trustMachine() {
    const text = normalizeQuestion(question);

    if (!text) {
      setNotice("Ask the universe a real question first.");
      return;
    }

    const answer: VoteChoice = Math.random() > 0.5 ? "yes" : "no";
    setMachineSign({ answer, text });
    setNotice("");

    if (supabase) {
      await supabase.from("machine_signs").insert({
        owner_id: user.id,
        question_text: text,
        answer
      });
      void refreshDashboard();
    }
  }

  async function createGuidedSign() {
    const text = normalizeQuestion(question);

    if (!text) {
      setNotice("Write the decision first. The universe appreciates a little specificity.");
      return;
    }

    if (!supabase) {
      setNotice("Add Supabase credentials to .env.local before creating share links.");
      return;
    }

    setBusy(true);
    setNotice("");
    setShareLink("");

    const slug = createSlug();
    const { error } = await supabase.from("questions").insert({
      owner_id: user.id,
      slug,
      question_text: text,
      response_limit: limit
    });

    setBusy(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    const link = getSignUrl(slug);
    setShareLink(link);
    setQuestion("");
    await navigator.clipboard?.writeText(link).catch(() => undefined);
    await refreshDashboard();
  }

  async function copyShareLink(link: string) {
    await navigator.clipboard?.writeText(link).catch(() => undefined);
    setNotice("Share link copied.");
  }

  async function shareSignLink(link: string, title = "Omenly sign") {
    if (navigator.share) {
      await navigator
        .share({
          title,
          text: "Give your sign on Omenly.",
          url: link
        })
        .catch(() => undefined);
      return;
    }

    await copyShareLink(link);
    setNotice("Sharing is not available in this browser, so I copied the link instead.");
  }

  async function finalizeSign(slug: string) {
    if (!supabase) {
      return;
    }

    setNotice("Calling the universe's mail room...");
    const { data, error } = await supabase.functions.invoke("finalize-sign", {
      body: { slug }
    });

    if (error) {
      setNotice(error.message);
      return;
    }

    const result = data as { status?: string; message?: string };
    setNotice(result.message || result.status || "Final sign checked.");
    await refreshDashboard();
  }

  return (
    <section className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Omenly</p>
          <h1>Welcome, {displayName}</h1>
        </div>
        <button className="ghost" type="button" onClick={() => void signOut()}>
          <LogOut size={18} />
          Sign out
        </button>
      </header>

      <section className="oracle-workbench">
        <div className="question-zone">
          <label htmlFor="decision">Should I</label>
          <textarea
            id="decision"
            placeholder="what do you want the universe to guide you for?"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={220}
          />
          <div className="workbench-actions">
            <button className="machine" type="button" onClick={() => void trustMachine()}>
              <Wand2 size={18} />
              I trust the machine
            </button>
            <button className="primary" type="button" disabled={busy} onClick={() => void createGuidedSign()}>
              {busy ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
              I want the universe to guide me
            </button>
          </div>
        </div>

        <aside className="settings-panel">
          <div className="setting-row">
            <div>
              <span>Response limit</span>
              <strong>{limit}</strong>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
            />
          </div>
          <p>
            Each browser gets one anonymous vote and one message. The link closes when the chosen
            number of people have responded.
          </p>
          <p className="rotating-quote compact">{quote}</p>
        </aside>
      </section>

      {machineSign && (
        <section className={`machine-result ${machineSign.answer}`}>
          <div>
            <p>{machineSign.text}</p>
            <h2>{machineSign.answer === "yes" ? "Yes" : "No"}</h2>
          </div>
          <Sparkles size={38} />
        </section>
      )}

      {shareLink && (
        <section className="share-strip">
          <div>
            <span>Your sign link is ready</span>
            <strong>{shareLink}</strong>
          </div>
          <button type="button" onClick={() => void copyShareLink(shareLink)}>
            <Copy size={18} />
            Copy
          </button>
          <button type="button" onClick={() => void shareSignLink(shareLink)}>
            <Share2 size={18} />
            Share
          </button>
        </section>
      )}

      {notice && <p className="notice">{notice}</p>}

      <section className="dashboard-grid">
        <div className="section-block">
          <div className="section-title">
            <h2>Your shared signs</h2>
            <button className="icon-button" type="button" aria-label="Refresh" onClick={() => void refreshDashboard()}>
              <RefreshCw size={18} />
            </button>
          </div>
          <div className="sign-list">
            {questions.length ? (
              questions.map((row) => {
                const signVotes = votes.filter((vote) => vote.question_id === row.id);
                const signMessages = messages.filter((message) => message.question_id === row.id);
                const yesCount = signVotes.filter((vote) => vote.choice === "yes").length;
                const noCount = signVotes.filter((vote) => vote.choice === "no").length;
                const link = getSignUrl(row.slug);
                const isSealed = row.status === "sealed";

                return (
                  <article className="sign-card" key={row.id}>
                    <div className="card-heading">
                      <h3>{row.question_text}</h3>
                      <span className={isSealed ? "pill sealed" : "pill open"}>
                        {isSealed ? "Sealed" : "Open"}
                      </span>
                    </div>
                    <div className="meter" aria-label="Slot progress">
                      <span style={{ width: `${Math.min(100, (row.visit_count / row.response_limit) * 100)}%` }} />
                    </div>
                    <div className="card-stats">
                      <span>
                        <Eye size={15} />
                        {row.visit_count}/{row.response_limit} responses
                      </span>
                      <span>
                        <ThumbsUp size={15} />
                        {yesCount}
                      </span>
                      <span>
                        <ThumbsDown size={15} />
                        {noCount}
                      </span>
                      <span>
                        <MessageCircle size={15} />
                        {signMessages.length}
                      </span>
                    </div>
                    <div className="card-actions">
                      <button type="button" onClick={() => void copyShareLink(link)}>
                        <Link2 size={16} />
                        Copy link
                      </button>
                      <button type="button" onClick={() => void shareSignLink(link, row.question_text)}>
                        <Share2 size={16} />
                        Share link
                      </button>
                      {isSealed && !row.results_email_sent_at && (
                        <button type="button" onClick={() => void finalizeSign(row.slug)}>
                          <Send size={16} />
                          Send result
                        </button>
                      )}
                      {row.results_email_sent_at && (
                        <span className="sent-label">
                          <Check size={15} />
                          Emailed
                        </span>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <EmptyState text="No shared signs yet." />
            )}
          </div>
        </div>

        <div className="section-block">
          <div className="section-title">
            <h2>Machine journal</h2>
            <Moon size={19} />
          </div>
          <div className="journal-list">
            {machineSigns.length ? (
              machineSigns.map((row) => (
                <article className="journal-item" key={row.id}>
                  <span className={row.answer === "yes" ? "answer yes" : "answer no"}>
                    {row.answer}
                  </span>
                  <p>{row.question_text}</p>
                </article>
              ))
            ) : (
              <EmptyState text="Machine answers you save will live here." />
            )}
          </div>
        </div>
      </section>
    </section>
  );
}

function SharedSignPage({
  slug,
  quote,
  navigate
}: {
  slug: string;
  quote: string;
  navigate: (path: string) => void;
}) {
  const [payload, setPayload] = useState<PublicQuestionPayload | null>(null);
  const [messages, setMessages] = useState<PublicMessagesPayload["messages"]>([]);
  const [selected, setSelected] = useState<VoteChoice | null>(null);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);
  const visitorKey = useMemo(() => getVisitorKeyForSlug(slug), [slug]);

  const refreshMessages = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const { data } = await supabase.rpc("get_public_messages", {
      p_slug: slug,
      p_visitor_key: visitorKey
    });
    const next = data as PublicMessagesPayload | null;
    setMessages(next?.messages || []);
  }, [slug, visitorKey]);

  useEffect(() => {
    if (loadedRef.current) {
      return;
    }

    loadedRef.current = true;

    async function claimVisit() {
      if (!supabase) {
        setLoading(false);
        setPayload({ found: false });
        return;
      }

      const { data, error } = await supabase.rpc("claim_question_visit", {
        p_slug: slug,
        p_visitor_key: visitorKey
      });

      if (error) {
        setNotice(error.message);
        setLoading(false);
        return;
      }

      const next = data as PublicQuestionPayload;

      if (!next.found || next.expired) {
        navigate(`/expired/${slug}`);
        return;
      }

      setPayload(next);
      setLoading(false);
      await refreshMessages();
    }

    void claimVisit();
  }, [navigate, refreshMessages, slug, visitorKey]);

  async function submitVote(choice: VoteChoice) {
    if (!supabase) {
      return;
    }

    setSelected(choice);
    const { data, error } = await supabase.rpc("submit_vote", {
      p_slug: slug,
      p_visitor_key: visitorKey,
      p_choice: choice
    });

    if (error) {
      setNotice(error.message);
      return;
    }

    const result = data as PublicSubmissionPayload;
    setNotice(result.message || "Your vote was placed in the sky.");
    await handleSubmissionResult(result);
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !message.trim()) {
      return;
    }

    const { data, error } = await supabase.rpc("submit_message", {
      p_slug: slug,
      p_visitor_key: visitorKey,
      p_body: message.trim()
    });

    if (error) {
      setNotice(error.message);
      return;
    }

    const result = data as PublicSubmissionPayload;
    setNotice(result.message || "Your anonymous message was added.");
    setMessage("");
    await refreshMessages();
    await handleSubmissionResult(result);
  }

  async function handleSubmissionResult(result: PublicSubmissionPayload) {
    if (!supabase) {
      return;
    }

    const remainingSlots = result.remainingSlots;

    if (typeof remainingSlots === "number") {
      setPayload((current) =>
        current?.question
          ? {
              ...current,
              remainingSlots,
              question: {
                ...current.question,
                visitCount: current.question.responseLimit - remainingSlots,
                status: result.sealed ? "sealed" : current.question.status
              }
            }
          : current
      );
    }

    if (result.sealed) {
      await supabase.functions.invoke("finalize-sign", {
        body: { slug }
      });
      navigate(`/expired/${slug}`);
    }
  }

  if (loading) {
    return <LoadingScreen quote={quote} />;
  }

  if (!payload?.found || !payload.question) {
    return <ExpiredPage slug={slug} navigate={navigate} />;
  }

  return (
    <section className="shared-page">
      <header className="shared-header">
        <p className="eyebrow">Anonymous sign request</p>
        <a
          className="small-link"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            navigate("/");
          }}
        >
          Omenly
        </a>
      </header>

      <section className="vote-surface">
        <div className="prompt">
          <span>Should they?</span>
          <h1>{payload.question.questionText}</h1>
        </div>

        <div className="vote-buttons" aria-label="Vote">
          <button
            className={selected === "yes" ? "vote yes selected" : "vote yes"}
            type="button"
            onClick={() => void submitVote("yes")}
          >
            <ThumbsUp size={22} />
            Yes
          </button>
          <button
            className={selected === "no" ? "vote no selected" : "vote no"}
            type="button"
            onClick={() => void submitVote("no")}
          >
            <ThumbsDown size={22} />
            No
          </button>
        </div>

        <div className="share-status">
          <Lock size={16} />
          {payload.remainingSlots === 0
            ? "This is the final response."
            : `${payload.remainingSlots} anonymous responses remain.`}
        </div>
      </section>

      <section className="message-band">
        <form className="message-form" onSubmit={(event) => void submitMessage(event)}>
          <label htmlFor="anonymous-message">Add an anonymous message</label>
          <div className="message-input">
            <input
              id="anonymous-message"
              maxLength={280}
              placeholder="Leave a kind sign, warning, or gut feeling"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <button type="submit">
              <Send size={18} />
              Send
            </button>
          </div>
        </form>

        {notice && <p className="notice">{notice}</p>}

        <div className="whisper-wall">
          {messages?.length ? (
            messages.map((row) => (
              <article className="whisper" key={row.id}>
                <MessageCircle size={17} />
                <p>{row.body}</p>
              </article>
            ))
          ) : (
            <EmptyState text="No anonymous messages yet." />
          )}
        </div>
      </section>

      <p className="rotating-quote page-quote">{quote}</p>
    </section>
  );
}

function ExpiredPage({
  slug,
  navigate
}: {
  slug: string;
  navigate: (path: string) => void;
}) {
  return (
    <section className="expired-page">
      <div>
        <p className="eyebrow">The sign is sealed</p>
        <h1>Someone got their sign from the universe.</h1>
        <p>
          This Omenly link has closed. The results and anonymous messages are being sent to the
          person who asked.
        </p>
      </div>
      <div className="expired-actions">
        <button className="primary" type="button" onClick={() => navigate("/")}>
          <Sparkles size={18} />
          Get your sign
        </button>
        <span>Omen code: {slug}</span>
      </div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <Sparkles size={18} />
      <span>{text}</span>
    </div>
  );
}

export default App;
