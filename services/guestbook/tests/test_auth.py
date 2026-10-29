import json
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from app import Settings, create_app


@pytest.fixture
def preview(tmp_path):
    content_dir = tmp_path / 'private'
    content_dir.mkdir()
    (content_dir / 'content.json').write_text(json.dumps({
        'identity': {'en': 'Owner Example', 'zh': '示例作者'},
        'home': {locale: {'profile': {}, 'education': {}, 'interests': []} for locale in ('en', 'zh')},
        'projects': [], 'assets': {}, 'github': 'https://github.com/example',
        'projectLinks': {'weyra': {'github': 'https://github.com/example/project'}}
    }))
    return Settings(db_path=tmp_path / 'db.sqlite3', content_dir=content_dir, development=True, mail_mode='file',
                    dev_mailbox=True, outbox_path=tmp_path / 'outbox.json', admin_email='owner@example.com')


@pytest.fixture
def now():
    return [datetime(2026, 10, 26, tzinfo=timezone.utc)]


def login(client, email='faculty@school.edu.cn', nickname='Faculty'):
    response = client.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': email})
    assert response.status_code == 200, response.text
    challenge = response.json()
    code = client.get('/dev/mailbox', params={'email': email}).json()['messages'][-1]['code']
    verified = client.post('/auth/verify', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','challengeId': challenge['challengeId'], 'code': code, 'nickname': nickname})
    assert verified.status_code == 200, verified.text
    return verified.json()


def test_config_and_verification_moderation_flow(preview, now):
    with TestClient(create_app(preview, clock=lambda: now[0]), base_url='http://localhost', client=('127.0.0.1', 8000)) as c:
        assert c.get('/auth/config').json() == {'registration': 'edu', 'deliveryMode': 'local', 'devMailbox': True,'privacyVersion':'2026-10-28.2'}
        assert c.post('/messages', json={'message': 'hi'}).status_code == 401
        assert c.get('/projects/weyra/links/github').status_code == 401
        user = login(c)
        assert user['user']['email'] == 'faculty@school.edu.cn'
        assert user['user']['role'] == 'user'
        headers = {'Authorization': 'Bearer ' + user['token']}
        item = c.post('/messages', json={'message': '<script>x</script>', 'name': 'forged'}, headers=headers).json()
        assert item['name'] == user['user']['nickname'] and item['status'] == 'pending'
        assert c.get('/messages').json() == {'messages': []}
        assert c.get('/messages/mine', headers=headers).json()['messages'] == [item]
        assert c.get('/admin/messages', headers=headers).status_code == 403
        assert c.get('/projects/weyra/links/github', headers=headers).json() == {'url': 'https://github.com/example/project'}
        assert c.get('/projects/weyra/links/unknown', headers=headers).status_code == 404
        other = login(c, 'other@university.edu')
        assert c.get('/messages/mine', headers={'Authorization': 'Bearer ' + other['token']}).json() == {'messages': []}
        admin = login(c, 'owner@example.com')
        ah = {'Authorization': 'Bearer ' + admin['token']}
        assert admin['user']['role'] == 'admin'
        pending = c.get('/admin/messages?status=pending', headers=ah).json()['messages']
        assert pending[0]['email'] == user['user']['email']
        for decision, visible in [('approved', True), ('rejected', False), ('approved', True)]:
            result = c.post(f"/admin/messages/{item['id']}/review", json={'decision': decision}, headers=ah)
            assert result.status_code == 200 and result.json()['reviewedAt']
            public = c.get('/messages').json()['messages']
            assert bool(public) == visible
            if public:
                assert set(public[0]) == {'id', 'name', 'message', 'createdAt'}
        assert c.post('/admin/messages/missing/review', json={'decision': 'approved'}, headers=ah).status_code == 404
        assert c.get('/admin/messages?status=invalid', headers=ah).status_code == 422
        assert c.get('/auth/me', headers=headers).json()['user'] == user['user']
        assert c.post('/auth/logout', json={}, headers=headers).status_code == 204
        assert c.get('/auth/me', headers=headers).status_code == 401
        with sqlite3.connect(preview.db_path) as db:
            assert db.execute('SELECT count(*) FROM review_audit').fetchone()[0] == 3
            dump = '\n'.join(db.iterdump())
            assert user['token'] not in dump
            assert '127.0.0.1' not in dump


@pytest.mark.parametrize('email', ['a@gmail.com', 'a@edu', 'a@edu.cn', 'a@edu.evil.com', 'a@not-edu.com', 'a@school.edu.com', 'x\r\nBcc:a@school.edu', '名字@school.edu', 'a..b@school.edu', 'a@-school.edu', 'a@school..edu', 'a@school.edu.', 'owner+evil@example.com'])
def test_ineligible_email(preview, email):
    with TestClient(create_app(preview)) as c:
        assert c.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': email}).status_code == 422


@pytest.mark.parametrize('email', ['FACULTY@DEPT.SCHOOL.EDU', 'a+b@school.edu.cn', 'teacher@dept.school.edu.uk', 'owner@example.com'])
def test_eligible_email_normalized(preview, email):
    with TestClient(create_app(preview), base_url='http://localhost', client=('127.0.0.1', 8000)) as c:
        result = login(c, email)
        assert result['user']['email'] == email.lower()


def test_otp_latest_ttl_single_use_and_expiry(preview, now):
    with TestClient(create_app(preview, clock=lambda: now[0]), base_url='http://localhost', client=('127.0.0.1', 8000)) as c:
        def issue():
            r = c.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': 'a@school.edu'})
            assert r.status_code == 200
            assert set(r.json()) == {'challengeId', 'expiresIn', 'resendAfter', 'deliveryMode'}
            assert r.json()['expiresIn'] == 600 and r.json()['resendAfter'] == 60
            return r.json()['challengeId'], c.get('/dev/mailbox?email=a@school.edu').json()['messages'][-1]['code']
        first, code = issue()
        assert c.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': 'a@school.edu'}).status_code == 429
        now[0] += timedelta(seconds=60)
        second, latest = issue()
        assert c.post('/auth/verify', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','challengeId': first, 'code': code}).status_code == 400
        result = c.post('/auth/verify', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','challengeId': second, 'code': latest, 'nickname': 'First'})
        assert result.status_code == 200
        assert c.post('/auth/verify', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','challengeId': second, 'code': latest}).status_code == 400
        now[0] += timedelta(seconds=60)
        third, expired = issue()
        now[0] += timedelta(seconds=600)
        assert c.post('/auth/verify', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','challengeId': third, 'code': expired}).status_code == 400
        now[0] += timedelta(hours=8)
        assert c.get('/auth/me', headers={'Authorization': 'Bearer ' + result.json()['token']}).status_code == 401


def test_concurrent_verify_only_consumes_once(preview):
    with TestClient(create_app(preview), base_url='http://localhost', client=('127.0.0.1', 8000)) as c:
        r = c.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': 'a@school.edu'}).json()
        code = c.get('/dev/mailbox?email=a@school.edu').json()['messages'][-1]['code']
        with ThreadPoolExecutor(max_workers=8) as pool:
            codes = list(pool.map(lambda _: c.post('/auth/verify', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','challengeId': r['challengeId'], 'code': code}).status_code, range(8)))
        assert codes.count(200) == 1
        assert codes.count(400) == 7


def test_brute_limit_persists_and_invalidates(preview):
    with TestClient(create_app(preview), base_url='http://localhost', client=('127.0.0.1', 8000)) as c:
        r = c.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': 'a@school.edu'}).json()
        correct = c.get('/dev/mailbox?email=a@school.edu').json()['messages'][-1]['code']
        wrong = '000000' if correct != '000000' else '111111'
        for _ in range(5):
            assert c.post('/auth/verify', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','challengeId': r['challengeId'], 'code': wrong}).status_code == 400
    with TestClient(create_app(preview)) as c:
        assert c.post('/auth/verify', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','challengeId': r['challengeId'], 'code': correct}).status_code == 429


def test_dev_mailbox_guards_and_permissions(preview):
    with TestClient(create_app(preview), base_url='http://localhost', client=('127.0.0.1', 8000)) as c:
        login(c)
        assert preview.outbox_path.stat().st_mode & 0o077 == 0
        assert c.get('/dev/mailbox?email=faculty@school.edu.cn', headers={'Host': 'evil.com'}).status_code == 404
        assert c.get('/dev/mailbox?email=faculty@school.edu.cn', headers={'Origin': 'https://wenyuecheng.cn'}).status_code == 404
    with TestClient(create_app(preview), base_url='http://localhost', client=('203.0.113.1', 8000)) as c:
        assert c.get('/dev/mailbox?email=faculty@school.edu.cn').status_code == 404
    for s in [replace(preview, development=False), replace(preview, trust_proxy_header=True)]:
        with pytest.raises(ValueError):
            with TestClient(create_app(s)):
                pass
    with TestClient(create_app(replace(preview, dev_mailbox=False))) as c:
        assert c.get('/dev/mailbox').status_code == 404
    with TestClient(create_app(Settings(db_path=preview.db_path))) as c:
        assert c.get('/dev/mailbox').status_code == 404
        assert c.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': 'x@school.edu'}).status_code == 503


def test_smtp_failure_invalidates_and_keeps_secrets_private(preview, monkeypatch):
    import app as module
    def fail(*args):
        raise OSError('secret network error')
    monkeypatch.setattr(module, 'deliver_code', fail)
    with TestClient(create_app(preview)) as c:
        response = c.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': 'a@school.edu'})
        assert response.status_code == 503 and 'secret' not in response.text
        with sqlite3.connect(preview.db_path) as db:
            assert db.execute('SELECT invalidated FROM challenges').fetchone()[0] == 1


def test_legacy_migrates_pending_without_loss(preview):
    with sqlite3.connect(preview.db_path) as db:
        db.execute('CREATE TABLE messages(id TEXT PRIMARY KEY, name TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL)')
        db.execute("INSERT INTO messages VALUES ('legacy','Old','Note','2026-01-01T00:00:00Z')")
    with TestClient(create_app(preview), base_url='http://localhost', client=('127.0.0.1', 8000)) as c:
        assert c.get('/messages').json() == {'messages': []}
        user = login(c, 'owner@example.com')
        rows = c.get('/admin/messages', headers={'Authorization': 'Bearer ' + user['token']}).json()['messages']
        assert rows[0]['id'] == 'legacy' and rows[0]['status'] == 'pending'


def test_anonymous_post_is_blocked(tmp_path):
    with TestClient(create_app(Settings(db_path=tmp_path / 'db.sqlite3'))) as c:
        assert c.post('/messages', json={'message': 'hi'}).status_code == 401


def test_existing_login_keeps_nickname_and_session_role_is_server_owned(preview, now):
    with TestClient(create_app(preview, clock=lambda: now[0]), base_url='http://localhost', client=('127.0.0.1', 8000)) as c:
        first = login(c, nickname='Original')
        now[0] += timedelta(seconds=60)
        second = login(c, nickname='Replacement')
        assert first['user'] == second['user']
        assert datetime.fromisoformat(second['expiresAt']).timestamp() - now[0].timestamp() == 28800
        for token in ['forged', second['token'] + 'x']:
            assert c.get('/auth/me', headers={'Authorization': 'Bearer ' + token}).status_code == 401
        token = second['token']
    # Changing the server admin setting takes effect on existing sessions.
    with TestClient(create_app(replace(preview, admin_email='faculty@school.edu.cn'), clock=lambda: now[0])) as c:
        assert c.get('/auth/me', headers={'Authorization': 'Bearer ' + token}).json()['user']['role'] == 'admin'


def test_issue_email_and_peer_limits_persist(preview, now, monkeypatch):
    import app as module
    monkeypatch.setattr(module, 'deliver_code', lambda *_: None)
    s = replace(preview, mail_mode='smtp', dev_mailbox=False)
    with TestClient(create_app(s, clock=lambda: now[0])) as c:
        for i in range(3):
            assert c.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': 'a@school.edu'}).status_code == 200
            now[0] += timedelta(seconds=60)
        assert c.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': 'a@school.edu'}).status_code == 429
        for i in range(7):
            assert c.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': f'{i}@school.edu'}).status_code == 200
    with TestClient(create_app(s, clock=lambda: now[0])) as c:
        assert c.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': 'fresh@school.edu'}).status_code == 429
        now[0] += timedelta(hours=1)
        assert c.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': 'a@school.edu'}).status_code == 200


def test_global_issue_daily_limit(preview, now, monkeypatch):
    import app as module
    monkeypatch.setattr(module, 'deliver_code', lambda *_: None)
    s = replace(preview, mail_mode='smtp', dev_mailbox=False, trust_proxy_header=True)
    with TestClient(create_app(s, clock=lambda: now[0]), client=('127.0.0.1', 8000)) as c:
        for i in range(100):
            assert c.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': f'{i}@school.edu'}, headers={'X-Portal-Client-IP': f'203.0.113.{i}'}).status_code == 200
        assert c.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': 'extra@school.edu'}, headers={'X-Portal-Client-IP': '203.0.114.1'}).status_code == 429
        now[0] += timedelta(days=1)
        assert c.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': 'extra@school.edu'}, headers={'X-Portal-Client-IP': '203.0.114.1'}).status_code == 200


def test_email_and_peer_verification_windows(preview, now, monkeypatch):
    import app as module
    from app import digest
    monkeypatch.setattr(module, 'deliver_code', lambda *_: None)
    monkeypatch.setattr(module.secrets, 'randbelow', lambda _: 123456)
    s = replace(preview, mail_mode='smtp', dev_mailbox=False, trust_proxy_header=True)
    with TestClient(create_app(s, clock=lambda: now[0]), client=('127.0.0.1', 8000)) as c:
        challenge = c.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': 'a@school.edu'}).json()['challengeId']
        # Exhaust the per-email verification window across distinct immediate proxy peers.
        for i in range(10):
            assert c.post('/auth/verify', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','challengeId': challenge, 'code': '000000'}, headers={'X-Portal-Client-IP': f'203.0.113.{i}'}).status_code in (400, 429)
        assert c.post('/auth/verify', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','challengeId': challenge, 'code': '000000'}, headers={'X-Portal-Client-IP': '203.0.113.99'}).status_code == 429
        # Unknown challenges still consume the peer verification budget.
        for _ in range(20):
            assert c.post('/auth/verify', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','challengeId': 'missing', 'code': '000000'}).status_code == 400
        assert c.post('/auth/verify', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','challengeId': 'missing-again', 'code': '000000'}).status_code == 429
        now[0] += timedelta(seconds=600)
        assert c.post('/auth/verify', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','challengeId': 'missing', 'code': '000000'}).status_code == 400
        with sqlite3.connect(s.db_path) as db:
            assert db.execute("SELECT count(*) FROM events WHERE kind='verify' AND subject_key=?", (digest(c.app.state.salt, 'email', 'a@school.edu'),)).fetchone()[0] == 10


def test_per_user_message_limit_survives_peer_changes(preview, monkeypatch):
    from app import digest
    import secrets
    import uuid
    s = replace(preview, mail_mode='smtp', dev_mailbox=False, trust_proxy_header=True)
    with TestClient(create_app(s), client=('127.0.0.1', 8000)) as c:
        uid, token = uuid.uuid4().hex, secrets.token_urlsafe(32)
        with sqlite3.connect(s.db_path) as db:
            db.execute('INSERT INTO users VALUES (?,?,?)', (uid, 'a@school.edu', 'A visitor'))
            db.execute('INSERT INTO sessions VALUES (?,?,?)', (digest(c.app.state.salt, 'session', token), uid, 9999999999))
        for i in range(4):
            response = c.post('/messages', json={'message': 'hi'}, headers={'Authorization': 'Bearer ' + token, 'X-Portal-Client-IP': f'203.0.113.{i}'})
            assert response.status_code == (201 if i < 3 else 429)


@pytest.mark.parametrize('security', ['ssl', 'starttls'])
def test_smtp_uses_verified_tls_and_safe_content(preview, monkeypatch, security):
    import app as module
    calls = []
    class SMTP:
        def __init__(self, host, port, **kwargs):
            calls.append(('connect', host, port, kwargs))
        def __enter__(self): return self
        def __exit__(self, *args): return False
        def ehlo(self): calls.append(('ehlo',))
        def starttls(self, **kwargs): calls.append(('tls', kwargs))
        def login(self, user, password): calls.append(('login', user, password))
        def send_message(self, message): calls.append(('message', message))
    monkeypatch.setattr(module.smtplib, 'SMTP', SMTP)
    monkeypatch.setattr(module.smtplib, 'SMTP_SSL', SMTP)
    s = replace(preview, mail_mode='smtp', dev_mailbox=False, smtp_host='smtp.example.com',
                smtp_security=security, smtp_from='sender@example.com', smtp_user='sender', smtp_password='test-password')
    with TestClient(create_app(s)) as c:
        response = c.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': 'faculty@school.edu'})
        assert response.status_code == 200
        assert response.json()['deliveryMode'] == 'smtp'
        connection = calls[0]
        assert connection[3]['timeout'] == 8
        context = connection[3]['context'] if security == 'ssl' else next(call[1]['context'] for call in calls if call[0] == 'tls')
        assert context.check_hostname and context.verify_mode == module.ssl.CERT_REQUIRED
        message = next(call[1] for call in calls if call[0] == 'message')
        assert message['To'] == 'faculty@school.edu' and message['From'].addresses[0].addr_spec == 'sender@example.com'
        assert message.get_content_type() == 'multipart/alternative'
        plain = message.get_body(preferencelist=('plain',)).get_content()
        html = message.get_body(preferencelist=('html',)).get_content()
        assert 'most recently requested code' in plain
        import re
        code = re.search(r'Your verification code: ([0-9]{6})', plain).group(1)
        assert code in html and 'wenyuecheng.cn' in str(message['Subject'])
        assert message['Date'] and message['Message-ID']
        assert '<script' not in html and '<img' not in html
        assert code.isdigit() and len(code) == 6 and code not in response.text
        with sqlite3.connect(s.db_path) as db:
            stored = db.execute('SELECT code_hash FROM challenges').fetchone()[0]
            assert len(stored) == 64 and stored != code


@pytest.mark.parametrize('changes', [
    {'smtp_security': 'none'}, {'smtp_port': 0}, {'smtp_host': 'host\r\nInjected'},
    {'smtp_from': 'bad\r\nTo: victim@school.edu'}, {'mail_mode': 'unknown'}, {'dev_mailbox': True},
])
def test_unsafe_mail_config_rejected(tmp_path, changes):
    with pytest.raises(ValueError):
        create_app(Settings(db_path=tmp_path / 'db.sqlite3', **changes))


def test_outbox_prunes_and_bounds(preview, now):
    from app import outbox
    for i in range(110):
        outbox(preview, now[0].timestamp(), {'email': 'a@school.edu', 'code': '123456', 'createdAt': now[0].isoformat(), 'timestamp': now[0].timestamp()})
    assert len(json.loads(preview.outbox_path.read_text())) == 100
    assert outbox(preview, now[0].timestamp() + 600) == []


def test_authorization_header_cors_and_no_privileged_input(preview):
    with TestClient(create_app(preview)) as c:
        preflight = c.options('/auth/me', headers={'Origin': 'https://wenyuecheng.cn', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization'})
        assert preflight.status_code == 200
        assert c.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': 'a@school.edu', 'role': 'admin'}).status_code == 422
        assert c.post('/auth/verify', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','challengeId': 'x', 'code': '000000', 'role': 'admin'}).status_code == 422


@pytest.mark.parametrize('host', ['[', 'localhost/evil', 'localhost:bad', 'user@localhost', 'localhost.evil.test', '[::1]'])
def test_mailbox_rejects_invalid_or_nonlocal_host(preview, host):
    with TestClient(create_app(preview), base_url='http://localhost', client=('127.0.0.1', 8000)) as c:
        assert c.get('/dev/mailbox?email=a@school.edu', headers={'Host': host}).status_code == 404


def test_owner_can_sign_in_without_nickname_and_profile_link_requires_session(preview):
    configured = replace(preview, admin_email='owner@example.com')
    with TestClient(create_app(configured), base_url='http://localhost', client=('127.0.0.1', 8000)) as c:
        assert c.get('/profile/links/github').status_code == 401
        sent = c.post('/auth/request-code', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','email': configured.admin_email}).json()
        code = c.get('/dev/mailbox', params={'email': configured.admin_email}).json()['messages'][-1]['code']
        response = c.post('/auth/verify', json={'privacyAccepted':True,'privacyVersion':'2026-10-28.2','challengeId': sent['challengeId'], 'code': code})
        assert response.status_code == 200
        session = response.json()
        assert session['user']['role'] == 'admin'
        assert session['user']['nickname'] == 'Eugene'
        headers = {'Authorization': 'Bearer ' + session['token']}
        assert c.get('/admin/messages', headers=headers).status_code == 200
        assert c.get('/profile/links/github', headers=headers).json() == {'url': 'https://github.com/example'}
        assert c.get('/profile/links/github', headers={'Authorization': 'Bearer invalid'}).status_code == 401


def test_existing_owner_session_has_canonical_name_without_reverification(preview):
    configured = replace(preview, admin_email='owner@example.com')
    with TestClient(create_app(configured), base_url='http://localhost', client=('127.0.0.1', 8000)) as c:
        owner = login(c, email=configured.admin_email, nickname='A visitor')
        with sqlite3.connect(configured.db_path) as db:
            db.execute('UPDATE users SET nickname=? WHERE email=?', ('A visitor', configured.admin_email))
            db.execute('INSERT INTO messages(id,name,message,created_at,user_id,status) VALUES (?,?,?,?,?,?)',
                       ('owner-old', 'Old owner name', 'An older owner note.', '2026-10-27T00:00:00Z', owner['user']['id'], 'approved'))
        response = c.get('/auth/me', headers={'Authorization': 'Bearer ' + owner['token']})
        assert response.json()['user']['nickname'] == 'Eugene'
        c.cookies.clear()
        assert c.get('/messages?page=1').json()['messages'][0]['name'] == 'Eugene'
        assert c.get('/messages/mine', headers={'Authorization': 'Bearer ' + owner['token']}).json()['messages'][0]['name'] == 'Eugene'


def test_verification_template_is_safe_and_has_matching_plain_text():
    from mail_template import verification_content
    plain, html = verification_content('001234', 0)
    assert '001234' in plain and '001234' in html
    assert '08:10' in plain and '08:10' in html
    assert '10 分钟' in plain and '10 分钟' in html
    assert '<script' not in html and 'src=' not in html
    for value in ['12345', '<svg/>', '１２３４５６', '123456\n']:
        with pytest.raises(ValueError):
            verification_content(value, 0)
