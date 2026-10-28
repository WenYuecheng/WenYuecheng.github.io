import sqlite3
from fastapi.testclient import TestClient
from app import create_app
from test_auth import preview
VERSION='2026-10-28.2'
ACCEPT={'privacyAccepted':True,'privacyVersion':VERSION}

def test_server_requires_current_explicit_consent_and_records_it(preview):
    with TestClient(create_app(preview),base_url='http://localhost',client=('127.0.0.1',8000)) as c:
        for extra in [{},{'privacyAccepted':False,'privacyVersion':VERSION},{'privacyAccepted':True,'privacyVersion':'outdated'},{'privacyAccepted':'true','privacyVersion':VERSION}]:
            assert c.post('/auth/request-code',json={'email':'reader@school.edu',**extra}).status_code==422
        assert not preview.outbox_path.exists()
        r=c.post('/auth/request-code',json={'email':'reader@school.edu',**ACCEPT});assert r.status_code==200
        challenge=r.json()['challengeId'];code=c.get('/dev/mailbox?email=reader@school.edu').json()['messages'][-1]['code']
        assert c.post('/auth/verify',json={'challengeId':challenge,'code':code}).status_code==422
        success=c.post('/auth/verify',json={'challengeId':challenge,'code':code,**ACCEPT});assert success.status_code==200
        with sqlite3.connect(preview.db_path) as db:
            row=db.execute('select privacy_version,copyright_version,accepted_at from user_consents where user_id=?',(success.json()['user']['id'],)).fetchone()
            assert row[:2]==(VERSION,VERSION) and row[2]>0
        assert c.get('/auth/me',headers={'Authorization':'Bearer '+success.json()['token']}).status_code==200


def test_legacy_unconsented_challenge_cannot_register(preview):
    with TestClient(create_app(preview),base_url='http://localhost',client=('127.0.0.1',8000)) as c:
        r=c.post('/auth/request-code',json={'email':'reader@school.edu',**ACCEPT});assert r.status_code==200
        challenge=r.json()['challengeId'];code=c.get('/dev/mailbox?email=reader@school.edu').json()['messages'][-1]['code']
        with sqlite3.connect(preview.db_path) as db:db.execute('delete from challenge_consents where challenge_id=?',(challenge,))
        assert c.post('/auth/verify',json={'challengeId':challenge,'code':code,**ACCEPT}).status_code==400
        with sqlite3.connect(preview.db_path) as db:assert db.execute('select count(*) from users').fetchone()[0]==0
