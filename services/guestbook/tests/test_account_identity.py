import re
import sqlite3
from dataclasses import replace
from datetime import timedelta

from fastapi.testclient import TestClient
from app import create_app
from test_auth import login, preview, now


def test_email_has_fixed_generated_name_not_caller_input(preview, now):
    with TestClient(create_app(preview, clock=lambda: now[0]), base_url='http://localhost', client=('127.0.0.1', 8000)) as c:
        first = login(c, nickname='Not a permitted nickname')
        assert re.fullmatch(r'Visitor \d{8}', first['user']['nickname'])
        now[0] += timedelta(seconds=60)
        second = login(c, nickname='Changed nickname')
        assert first['user'] == second['user']
        other = login(c, 'other@school.edu')
        assert first['user']['nickname'] != other['user']['nickname']
        note = c.post('/messages', json={'message':'hello','name':'Forged'}, headers={'Authorization':'Bearer '+first['token']}).json()
        assert note['name'] == first['user']['nickname']
        zh = c.get('/auth/me?locale=zh', headers={'Authorization':'Bearer '+first['token']}).json()['user']
        assert zh['nickname'] == '访客' + first['user']['nickname'][-8:]


def test_cookie_restores_session_in_fresh_client_and_logout_revokes_it(preview, now):
    with TestClient(create_app(preview, clock=lambda: now[0]), base_url='http://localhost', client=('127.0.0.1', 8000)) as c:
        signed = login(c)
        assert c.get('/auth/me').status_code == 200
        assert c.get('/auth/me').json()['user'] == signed['user']
        cookie = c.cookies.get('eugene_session')
        assert cookie
        with TestClient(create_app(preview, clock=lambda: now[0]), base_url='http://localhost') as fresh:
            fresh.cookies.set('eugene_session', cookie)
            assert fresh.get('/auth/me').status_code == 200
            assert fresh.post('/auth/logout', json={}).status_code == 403
            assert fresh.post('/auth/logout', json={}, headers={'Origin':'http://localhost:4321'}).status_code == 204
        assert c.get('/auth/me').status_code == 401


def test_existing_custom_names_are_migrated_without_changing_accounts(preview, now):
    with TestClient(create_app(preview, clock=lambda: now[0]), base_url='http://localhost', client=('127.0.0.1', 8000)) as c:
        first = login(c)
    with sqlite3.connect(preview.db_path) as db:
        db.execute('UPDATE users SET nickname=? WHERE id=?', ('Legacy custom name', first['user']['id']))
    with TestClient(create_app(preview, clock=lambda: now[0])) as c:
        me = c.get('/auth/me', headers={'Authorization':'Bearer '+first['token']}).json()['user']
        assert me['id'] == first['user']['id']
        assert re.fullmatch(r'Visitor \d{8}', me['nickname'])


def test_ten_minute_code_ttl_does_not_block_resend_after_sixty_seconds(preview, now):
    with TestClient(create_app(preview, clock=lambda: now[0]), base_url='http://localhost', client=('127.0.0.1', 8000)) as c:
        first = login(c)
        now[0] += timedelta(seconds=60)
        again = c.post('/auth/request-code', json={'email':first['user']['email'],'privacyAccepted':True,'privacyVersion':'2026-10-28.2'})
        assert again.status_code == 200
        assert again.json()['resendAfter'] == 60
        assert c.get('/auth/me', headers={'Authorization':'Bearer '+first['token']}).status_code == 200


def test_production_cookie_is_secure_httponly_and_server_owned(preview, monkeypatch, now):
    import app as module
    code = []
    monkeypatch.setattr(module, 'deliver_code', lambda _settings, _email, value, _stamp: code.append(value))
    settings = replace(preview, development=False, dev_mailbox=False, mail_mode='smtp')
    payload = {'privacyAccepted':True,'privacyVersion':'2026-10-28.2'}
    with TestClient(create_app(settings, clock=lambda: now[0]), base_url='https://wenyuecheng.cn') as c:
        challenge = c.post('/auth/request-code',json={'email':'reader@school.edu',**payload}).json()['challengeId']
        signed = c.post('/auth/verify',json={'challengeId':challenge,'code':code[-1],**payload})
        cookie = signed.headers['set-cookie']
        assert cookie.startswith('__Host-eugene_session=')
        for attribute in ['HttpOnly','Secure','SameSite=lax','Path=/','Max-Age=28800']:
            assert attribute in cookie
        assert 'Domain=' not in cookie
        assert c.get('/auth/me').status_code == 200
        assert c.get('/auth/me',headers={'Authorization':'Bearer forged'}).status_code == 401
        assert c.post('/auth/logout',json={},headers={'Origin':'https://evil.example'}).status_code == 403
        now[0] += timedelta(hours=8)
        assert c.get('/auth/me').status_code == 401
