import json
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from dataclasses import replace
import pytest
from fastapi.testclient import TestClient
from app import create_app
from test_auth import preview, now, login


def payload(key='a'*32):
    return dict(category='bug',title='A display problem',message='The page overlaps on my phone.',page='/zh/contact/',context='390x844',requestId=key)


def test_feedback_auth_mail_quota_idempotency_and_reset(preview,now):
    now[0]=now[0].replace(hour=15,minute=59)
    with TestClient(create_app(preview,clock=lambda:now[0]),base_url="http://localhost",client=("127.0.0.1",8000)) as c:
        assert c.post('/feedback',json=payload()).status_code==401
        user=login(c);h={'Authorization':'Bearer '+user['token']}
        assert c.get('/feedback/quota',headers=h).json()['remaining']==3
        for i in range(3):
            p=payload(str(i)*32)
            sent=c.post('/feedback',json=p,headers=h)
            assert sent.status_code==200,sent.text
            assert c.post('/feedback',json=p,headers=h).status_code==200
        assert c.post('/feedback',json=payload('b'*32),headers=h).status_code==429
        rows=json.loads(preview.outbox_path.read_text());reports=[x for x in rows if x.get('kind')=='feedback']
        assert len(reports)==3 and reports[0]['email']==preview.admin_email
        assert reports[0]['sender']==user['user']['email']
        # Beijing day boundary (16:00 UTC), independent of server local timezone.
        now[0]=now[0].replace(hour=16,minute=0)
        assert c.get('/feedback/quota',headers=h).json()['remaining']==3
        assert c.post('/feedback',json=payload('c'*32),headers=h).status_code==200


def test_feedback_simultaneous_submissions_cannot_exceed_quota(preview,now):
    with TestClient(create_app(preview,clock=lambda:now[0]),base_url="http://localhost",client=("127.0.0.1",8000)) as c:
        user=login(c);h={'Authorization':'Bearer '+user['token']}
        def send(i):return c.post('/feedback',json=payload(f'{i:032d}'),headers=h).status_code
        with ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(send,range(8)))
        assert results.count(200)==3 and results.count(429)==5
    with TestClient(create_app(preview,clock=lambda:now[0]),base_url="http://localhost",client=("127.0.0.1",8000)) as c:
        assert c.get('/feedback/quota',headers=h).json()['remaining']==0


def test_feedback_server_recipient_and_failures(preview,monkeypatch):
    import app
    with TestClient(create_app(preview),base_url="http://localhost",client=("127.0.0.1",8000)) as c:
        user=login(c);h={'Authorization':'Bearer '+user['token']}
        assert c.post('/feedback',json={**payload(),'recipient':'attacker@example.com'},headers=h).status_code==422
        assert c.post('/feedback',json={**payload(),'title':'Hello\r\nBcc: attack'},headers=h).status_code==422
        assert c.post('/feedback',json={**payload(),'message':' '},headers=h).status_code==422
        def fail(*args):raise OSError('smtp password must not appear')
        monkeypatch.setattr(app,'deliver_feedback',fail)
        r=c.post('/feedback',json=payload(),headers=h)
        assert r.status_code==503 and 'password' not in r.text
        assert c.post('/feedback',json=payload(),headers=h).status_code==503
        assert c.get('/feedback/quota',headers=h).json()['remaining']==2

def test_feedback_mail_is_branded_escaped_and_has_trusted_headers(preview,monkeypatch):
    import app
    delivered=[]
    monkeypatch.setattr(app,'send_mail',lambda settings,message:delivered.append(message))
    settings=replace(preview,mail_mode='smtp',smtp_host='smtp.example.com',smtp_from='sender@example.com')
    report=payload();report['title']='A <display> problem';report['message']='<script>bad()</script> & text'
    app.deliver_feedback(settings,'faculty@school.edu',report,now_time:=1700000000)
    message=delivered[0]
    assert str(message['To'])==preview.admin_email
    assert str(message['Reply-To'])=='faculty@school.edu'
    body=message.get_body(preferencelist=('html',)).get_content()
    assert '<script>' not in body and '&lt;script&gt;' in body and 'EUGENE' in body


def test_feedback_accepts_full_unicode_description_and_checks_retention(preview,now):
    import sqlite3
    with TestClient(create_app(preview,clock=lambda:now[0]),base_url='http://localhost',client=('127.0.0.1',8000)) as c:
        user=login(c);h={'Authorization':'Bearer '+user['token']}
        assert c.post('/feedback',json={**payload(),'message':'测试中文'*750},headers=h).status_code==200
        with sqlite3.connect(preview.db_path) as db:
            db.execute('UPDATE feedback_reports SET created_at=?',(now[0].timestamp()-31*86400,))
        c.get('/feedback/quota',headers=h)
        with sqlite3.connect(preview.db_path) as db:assert db.execute('select count(*) from feedback_reports').fetchone()[0]==0
