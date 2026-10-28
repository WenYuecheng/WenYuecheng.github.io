"""Original, self-contained transactional email; no remote assets or tracking."""
import re
from datetime import datetime, timedelta, timezone


def verification_content(code: str, timestamp: float) -> tuple[str, str]:
    if not re.fullmatch(r'[0-9]{6}', code):
        raise ValueError('Verification code must contain six digits.')
    local = timezone(timedelta(hours=8))
    expires = datetime.fromtimestamp(timestamp + 600, local).strftime('%H:%M')
    plain = (
        'Eugene · wenyuecheng.cn\n登录确认 / Verify your sign-in\n\n'
        f'你的验证码是：{code}\nYour verification code: {code}\n\n'
        f'10 分钟内有效，本次验证码将于北京时间 {expires} 失效。\n'
        '请返回发起登录的页面填写。重新发送后，旧验证码会失效。\n'
        'The code expires in 10 minutes. Return to your sign-in page and enter it.\n'
        'Only the most recently requested code is valid.\n\n'
        '请勿向任何人转发此验证码。若不是你本人操作，无需采取任何行动。\n'
        'Never share this code. If you did not request it, you can ignore this email.\n\n'
        'Eugene 的个人空间 / Eugene’s personal space\nhttps://wenyuecheng.cn/\n'
    )
    html = f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Eugene · 登录确认</title>
<style>@media only screen and (max-width:600px){{.outer{{padding:20px 12px!important}}.content{{padding:28px 22px!important}}.code{{font-size:34px!important;letter-spacing:7px!important}}}}</style></head>
<body style="margin:0;padding:0;background-color:#eef2f7;color:#263245;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">wenyuecheng.cn 登录确认，验证码 10 分钟内有效。请勿向他人转发。</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f7;"><tr><td class="outer" align="center" style="padding:48px 20px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background-color:#ffffff;border:1px solid #dde5f0;border-radius:20px;overflow:hidden;">
<tr><td style="background-color:#0d1830;padding:28px 32px;border-radius:20px 20px 0 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-family:Georgia,serif;font-size:23px;font-weight:bold;color:#e6f3ff;">✦ &nbsp;Eugene<span style="color:#8fcaff;">.</span></td></tr><tr><td style="padding-top:10px;font-size:12px;letter-spacing:1px;color:#afc4de;">wenyuecheng.cn &nbsp;·&nbsp; Eugene 的个人空间</td></tr></table></td></tr>
<tr><td class="content" style="padding:36px 36px 32px;">
<p style="margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:1px;color:#56779d;">登录确认 / SIGN-IN VERIFICATION</p>
<h1 style="margin:0 0 16px;font-size:28px;line-height:1.4;font-weight:600;color:#192a43;">很高兴，再次与你相遇。</h1>
<p style="margin:0 0 25px;font-size:15px;line-height:1.9;color:#59677a;">请在登录页面输入下方验证码，<br>继续探索Eugene 的个人空间。</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #cee1f3;border-radius:14px;background-color:#f0f7ff;"><tr><td align="center" style="padding:24px 12px 12px;font-size:12px;color:#547394;">你的专属验证码 · Verification code</td></tr><tr><td class="code" align="center" style="padding:0 4px 16px 12px;font-family:Consolas,'SFMono-Regular','Courier New',monospace;font-size:42px;letter-spacing:10px;line-height:1.35;font-weight:bold;color:#173f6b;">{code}</td></tr><tr><td align="center" style="padding:0 12px 22px;font-size:12px;line-height:1.8;color:#557392;">10 分钟内有效 &nbsp;·&nbsp; 北京时间 {expires} 失效</td></tr></table>
<p style="margin:22px 0 0;font-size:13px;line-height:1.9;color:#647185;">请返回发起登录的页面填写。若你重新获取了验证码，请使用<strong style="font-weight:600;color:#344d6c;">最新一封邮件</strong>中的数字。</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:25px;border-top:1px solid #e8edf4;"><tr><td style="padding-top:20px;font-size:12px;line-height:1.9;color:#758196;">请勿向任何人转发验证码。若非本人操作，可直接忽略此邮件。<br>Never share this code. If you didn’t request it, no action is needed.</td></tr></table>
</td></tr></table>
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;"><tr><td align="center" style="padding:24px 12px 0;font-size:12px;line-height:1.9;color:#7b879a;">道阻且长，行则将至<br><a href="https://wenyuecheng.cn/" style="color:#55769b;text-decoration:none;">wenyuecheng.cn</a> &nbsp;·&nbsp; Eugene<br><span style="font-size:11px;color:#8b95a5;">这是一封自动发送的登录邮件，无需回复。</span></td></tr></table>
</td></tr></table></body></html>'''
    return plain, html
