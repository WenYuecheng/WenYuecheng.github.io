import type {ReactNode} from 'react';

/** Shared stationery; all marks are decorative and stay outside document text. */
export function LegalPaper({children}:{children:ReactNode}) {
 return <main id="main" className="privacy-page">
  <article className="glass legal-paper">
   <div className="legal-stationery" aria-hidden="true">
    <span className="legal-paperclip"/>
    <div className="legal-postmark"><span>✧</span><i/><i/><i/></div>
    <div className="legal-stamp"><svg viewBox="0 0 64 78" fill="none"><path d="M32 61V27m0 24C15 51 16 37 16 37s16-1 16 14Zm0-9c17 0 16-14 16-14s-16-1-16 14Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="m32 12 3.5 8.5L44 24l-8.5 3.5L32 36l-3.5-8.5L20 24l8.5-3.5L32 12Z" fill="currentColor" fillOpacity=".35"/><path d="M14 66h36M24 71h16" stroke="currentColor" strokeLinecap="round"/></svg></div>
    <div className="legal-wax-seal">✦</div>
   </div>
   <div className="legal-letter-body">{children}</div>
  </article>
 </main>;
}
