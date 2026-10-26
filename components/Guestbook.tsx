'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LoaderCircle, Send, Flower2 } from 'lucide-react';
import { content, site, type Locale } from '../data/site';

type Note = { id: string | number; name: string; message: string; createdAt: string };
const requestTimeout = 10_000;
function mergeNotes(current: Note[], incoming: Note[]) {
 const seen = new Set<string>();
 return [...current, ...incoming].filter(note => {
  const id = String(note.id);
  if (seen.has(id)) return false;
  seen.add(id);
  return true;
 }).slice(0, 60);
}

export default function Guestbook({ locale }: { locale: Locale }) {
 const t = content[locale].guestbook;
 const [notes, setNotes] = useState<Note[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(false);
 const [status, setStatus] = useState(''), [sending, setSending] = useState(false), [hydrated, setHydrated] = useState(false), [loadAttempt, setLoadAttempt] = useState(0);
 const [name, setName] = useState(''), [message, setMessage] = useState(''), [website, setWebsite] = useState('');
 const saveVersion = useRef(0), postController = useRef<AbortController | null>(null);
 useEffect(() => {
  setHydrated(true);
  return () => postController.current?.abort();
 }, []);
 useEffect(() => {
  const controller = new AbortController(), version = saveVersion.current;
  let active = true;
  const timer = setTimeout(() => controller.abort(), requestTimeout);
  setLoading(true);
  setError(false);
  fetch(`${site.api}/messages`, { signal: controller.signal }).then(async response => {
   if (!response.ok) throw Error();
   const data = await response.json();
   if (active) setNotes(current => mergeNotes(current, Array.isArray(data.messages) ? data.messages : []));
  }).catch(() => {
   // An older load must not turn a confirmed save into an unavailable wall.
   if (active && saveVersion.current === version) setError(true);
  }).finally(() => {
   clearTimeout(timer);
   if (active) setLoading(false);
  });
  return () => { active = false; clearTimeout(timer); controller.abort(); };
 }, [loadAttempt]);
 async function submit(event: FormEvent) {
  event.preventDefault();
  if (!message.trim() || sending || !hydrated) return;
  setSending(true);
  setStatus('');
  const controller = new AbortController();
  postController.current = controller;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, requestTimeout);
  try {
   const response = await fetch(`${site.api}/messages`, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, message, website }) });
   if (!response.ok) {
    setStatus(response.status === 429 ? (locale === 'zh' ? '先歇一会儿，稍后再留一张纸条吧。' : 'A little pause—please try again later.') : t.failed);
    return;
   }
   const note = await response.json();
   if (controller.signal.aborted) return;
   saveVersion.current++;
   setNotes(current => mergeNotes([note], current));
   setMessage('');
   setStatus(t.success);
   setError(false);
   setLoading(false);
  } catch {
   if (!controller.signal.aborted || timedOut) setStatus(timedOut ? (locale === 'zh' ? '请求超时，纸条可能已经保存。请先刷新留言，再决定是否重试；草稿已保留。' : 'The request timed out. Your note may have been saved. Reload the notes before retrying; your draft is retained.') : t.failed);
  } finally {
   clearTimeout(timer);
   if (postController.current === controller) postController.current = null;
   setSending(false);
  }
 }
 const retry = locale === 'zh' ? '重新加载留言' : 'Retry loading notes';
 return <>
  <form className="glass note-form" onSubmit={submit}>
   <noscript><p className="no-script-note">{locale === 'zh' ? '启用 JavaScript 后即可加载和发送留言，也可以通过邮箱联系我。' : 'Enable JavaScript to load and send notes. You can also reach me by email.'}</p></noscript>
   <fieldset className="note-fields" disabled={!hydrated}>
    <div className="section-kicker"><Flower2 size={17} />{locale === 'zh' ? '写一张小纸条' : 'Write a little note'}</div>
    <div className="form-row">
     <label><span>{t.name}</span><input name="name" maxLength={40} value={name} onChange={event => setName(event.target.value)} autoComplete="nickname" /></label>
     <label className="honeypot" aria-hidden="true">Website<input name="website" value={website} onChange={event => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" /></label>
     <label className="message-label"><span>{t.message}</span><textarea name="message" required maxLength={500} value={message} onChange={event => setMessage(event.target.value)} rows={3} /><small>{message.length} / 500</small></label>
    </div>
    <div className="form-bottom"><p role="status">{status || t.max}</p><button className="button primary" disabled={!message.trim() || sending}>{sending ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />} {sending ? t.sending : t.send}</button></div>
   </fieldset>
  </form>
  {loading && notes.length === 0 ? <p className="empty-notes" role="status">{t.loading}</p> : error ? <div className="empty-notes"><p role="status">{t.error}</p><button className="button primary" onClick={() => setLoadAttempt(attempt => attempt + 1)}>{retry}</button></div> : notes.length === 0 ? <p className="empty-notes">{t.empty}</p> : <div className="notes-wall">{notes.map((note, index) => <article className={`pinned-note color-${index % 4}`} key={note.id}>
   <span className="note-pin" /><p>{note.message}</p><footer><strong>{note.name === 'Anonymous' ? t.anonymous : note.name}</strong><time dateTime={note.createdAt}>{Number.isNaN(Date.parse(note.createdAt)) ? '' : new Date(note.createdAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Shanghai' })}</time></footer>
  </article>)}</div>}
  {status.includes(locale === 'zh' ? '请求超时' : 'request timed out') && !loading && <button className="button primary" onClick={() => setLoadAttempt(attempt => attempt + 1)}>{retry}</button>}
 </>;
}
