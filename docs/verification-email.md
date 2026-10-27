# Personal verification email

The original email uses the site's midnight-blue / ice-blue opening identity, a text wordmark, one clearly isolated six-digit code and a concise expiration / latest-code explanation. No remote image, font, script, tracking pixel or third-party runtime is required. The code stays contiguous selectable text, including leading zeros.

Implementation: `services/guestbook/mail_template.py` renders a self-contained table-based HTML alternative with inline styles and a plain-text alternative. SMTP remains certificate-verified and keeps the existing provider credentials server-side. The message uses a branded sender display name and subject, plus Date and unique Message-ID headers. Expiration is displayed in Beijing time and corresponds to the existing ten-minute server TTL. No authentication, rate-limit or one-use behavior was weakened.

The multipart HTML/text approach was checked against primary provider documentation: [Postmark’s single-email documentation](https://postmarkapp.com/developer/user-guide/send-email-with-api/send-a-single-email). Design reference: [Postmark transactional email patterns](https://postmarkapp.com/email-templates); no third-party template or brand was copied.

Local screenshot previews use a nonfunctional sample code; they are browser layout checks, not a claim of testing every email client. Automated SMTP tests inspect MIME alternatives, sender, TLS verification, matching six-digit content, Date / Message-ID and absence of remote images/scripts. The next user-requested verification email uses the new layout; no additional live email was sent during implementation.

Administrator identity comes from the configured server-side owner email. The owner's canonical nickname is Yuecheng Wen, including existing sessions whose stored nickname was the generic A visitor. English account UI displays Yuecheng Wen. Other accounts retain their own nicknames and never gain permissions through a nickname.
