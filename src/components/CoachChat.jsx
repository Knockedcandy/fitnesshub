'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Dumbbell, LoaderCircle, RefreshCcw, Sparkles, UserRound } from 'lucide-react';
import { loadPlannerData } from '@/local/database';
import { events, trackEvent } from '@/utils/analytics';

const prompts = [
  { title: 'Plan my session', text: 'Explain today’s workout and the order I should do it in.' },
  { title: 'Build a warmup', text: 'Give me a simple warmup for today’s workout.' },
  { title: 'Swap an exercise', text: 'Help me replace an exercise in my plan.' },
  { title: 'Improve recovery', text: 'What should I focus on today for food and recovery?' }
];

function message(role, content) {
  return { id: crypto.randomUUID(), role, content, timestamp: new Date().toISOString() };
}

function resizeComposer(textarea) {
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  textarea.style.overflowY = textarea.scrollHeight > 160 ? 'auto' : 'hidden';
}

function CoachMark({ welcome = false }) {
  return <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-xl border border-violet-200/15 bg-violet-300/10 text-violet-200 ${welcome ? 'mx-auto h-11 w-11' : 'h-8 w-8'}`}>
    <Sparkles size={welcome ? 20 : 15} strokeWidth={1.8} />
  </span>;
}

const initialMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Ask about your saved plan, exercise form, substitutions, nutrition basics, or gym confidence.',
  timestamp: null
};

export default function CoachChat() {
  const [messages, setMessages] = useState([initialMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const endRef = useRef(null);
  const textareaRef = useRef(null);
  const sendingRef = useRef(false);
  const conversation = messages.filter((item) => item.id !== 'welcome');
  const hasConversation = conversation.length > 0;

  useEffect(() => {
    resizeComposer(textareaRef.current);
  }, [input]);

  useEffect(() => {
    if (hasConversation) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [hasConversation, messages, loading]);

  async function getContext() {
    const saved = await loadPlannerData();
    return { today: new Date().toLocaleDateString('en-US', { weekday: 'long' }), profile: saved.profile || {}, plan: saved.plan || {}, nutrition: saved.nutrition || {} };
  }

  async function send(rawText = input) {
    const text = String(rawText).trim();
    if (!text || loading || sendingRef.current) return;
    sendingRef.current = true;
    const userMessage = message('user', text);
    const next = [...conversation, userMessage].slice(-30);
    setMessages(next);
    setInput('');
    setLoading(true);
    setNotice('');

    try {
      const context = await getContext();
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 26_000);
      let response;
      try {
        response = await fetch('/api/coach', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            context,
            history: next.slice(0, -1).slice(-8).map(({ role, content }) => ({ role, content }))
          })
        });
      } finally {
        window.clearTimeout(timeout);
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const fallbackError = response.status === 429
          ? 'You have reached the current message limit. Please try again later.'
          : 'The coach is temporarily unavailable.';
        throw new Error(data.error || fallbackError);
      }
      setMessages([...next, message('assistant', data.reply || 'I could not answer that yet.')]);
      if (data.degraded) setNotice('Using built-in plan guidance while the live coach is unavailable.');
      trackEvent(events.aiCoachMessage, { source: 'device', degraded: Boolean(data.degraded) });
    } catch (error) {
      const content = error?.name === 'AbortError'
        ? 'The coach took too long to answer. Try a shorter question.'
        : error.message || 'The coach is temporarily unavailable. Try again shortly.';
      setMessages([...next, message('assistant', content)]);
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }

  function clearConversation() {
    setMessages([initialMessage]);
    setInput('');
    setNotice('');
  }

  return (
    <section className="flex h-[calc(100dvh-5.2rem)] min-h-0 w-full flex-col overflow-hidden bg-slate-950/75 lg:h-dvh">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <CoachMark />
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-white sm:text-lg">FitLife Coach</h1>
            <p className="truncate text-xs text-slate-400">Plan-aware fitness guidance</p>
          </div>
        </div>
        <button
          type="button"
          onClick={clearConversation}
          disabled={loading || !hasConversation}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          <RefreshCcw size={16} aria-hidden="true" />
          <span className="hidden sm:inline">New chat</span>
        </button>
      </header>

      {notice && <p role="status" className="mx-4 mt-3 rounded-xl border border-amber-200/10 bg-amber-300/10 px-3 py-2 text-xs text-amber-100 sm:mx-6">{notice}</p>}

      <div role="log" aria-live="polite" aria-busy={loading} className="min-h-0 flex-1 overflow-y-auto">
        {!hasConversation ? (
          <div className="flex min-h-full items-center justify-center px-5 py-10 sm:px-8">
            <div className="w-full max-w-3xl text-center">
              <CoachMark welcome />
              <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">What can I help you train?</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">Ask naturally. I can use your saved workout and nutrition targets when they are available.</p>
              <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
                {prompts.map((prompt) => (
                  <button
                    type="button"
                    disabled={loading}
                    key={prompt.title}
                    onClick={() => send(prompt.text)}
                    className="group rounded-2xl border border-white/10 bg-white/[.045] p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-white/[.075] disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-100"><Dumbbell size={16} className="text-cyan-300" aria-hidden="true" />{prompt.title}</span>
                    <span className="mt-2 block text-sm leading-5 text-slate-400 group-hover:text-slate-300">{prompt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
            {conversation.map((item) => (
              <article key={item.id} className={`flex gap-3 py-4 sm:gap-4 ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {item.role === 'assistant' && <CoachMark />}
                <div className={item.role === 'user' ? 'max-w-[85%] rounded-3xl bg-white/10 px-4 py-3 text-slate-100' : 'min-w-0 max-w-[calc(100%-3rem)] flex-1 text-slate-200'}>
                  <p className={`mb-1 text-xs font-bold ${item.role === 'user' ? 'text-right text-cyan-200' : 'text-cyan-200'}`}>{item.role === 'user' ? 'You' : 'FitLife Coach'}</p>
                  <p className="whitespace-pre-wrap text-sm leading-7 sm:text-[15px]">{item.content}</p>
                  {item.timestamp && <p className={`mt-2 text-[10px] text-slate-500 ${item.role === 'user' ? 'text-right' : ''}`}>{new Date(item.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>}
                </div>
                {item.role === 'user' && <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300"><UserRound size={16} aria-hidden="true" /></span>}
              </article>
            ))}
            {loading && (
              <div className="flex gap-4 py-4 text-slate-300">
                <CoachMark />
                <div>
                  <p className="text-xs font-bold text-cyan-200">FitLife Coach</p>
                  <div className="mt-3 flex gap-1.5" aria-label="Thinking">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-950/40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-5 sm:pt-6">
        <div className="mx-auto max-w-3xl">
          <div className="coach-composer rounded-[1.65rem] border border-white/15 bg-slate-800/90 px-3 pb-2.5 pt-3 shadow-[0_16px_50px_rgba(0,0,0,.3)] sm:px-4">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => { setInput(event.target.value); resizeComposer(event.currentTarget); }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void send();
                }
              }}
              maxLength={1200}
              rows={1}
              aria-label="Message FitLife Coach"
              aria-describedby="coach-composer-help"
              className="block max-h-40 min-h-9 w-full resize-none border-0 bg-transparent px-1 py-1 text-base leading-7 text-white outline-none placeholder:text-slate-400 focus-visible:outline-none"
              placeholder="Ask about your workout plan..."
            />
            <div className="mt-1 flex min-h-11 items-center justify-between gap-3 pl-1">
              <span id="coach-composer-help" className="text-[11px] text-slate-400">
                <span className="hidden sm:inline">Enter to send · Shift+Enter for a new line</span>
                <span className="sm:hidden">Your coach is ready when you are</span>
              </span>
              <div className="flex shrink-0 items-center gap-3">
                {input.length >= 1000 && <span className="text-[11px] tabular-nums text-slate-400" aria-live="polite">{input.length}/1200</span>}
                <button type="submit" disabled={loading || !input.trim()} aria-label={loading ? 'Sending message' : 'Send message'} title="Send message" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-violet-400 text-slate-950 shadow-lg shadow-cyan-950/40 transition duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-none disabled:bg-white/10 disabled:text-slate-500 disabled:shadow-none focus-visible:outline-offset-2">
                  {loading ? <LoaderCircle size={19} className="animate-spin" aria-hidden="true" /> : <ArrowUp size={21} strokeWidth={2.5} aria-hidden="true" />}
                </button>
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] leading-4 text-slate-500">Fitness guidance can be imperfect. Stop for sharp pain and use a qualified professional for medical concerns.</p>
        </div>
      </form>
    </section>
  );
}
