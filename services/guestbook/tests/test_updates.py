import sqlite3
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from app import create_app
from test_auth import login, now, preview


SEED_ZH = '整理了最近读过的论文，已收录在阅读选刊中。欢迎沿着原文链接继续探索。'
SEED_EN = 'The papers I have been reading are now collected in Reading. Follow the original links to explore further.'


@pytest.fixture
def client(preview, now):
    with TestClient(create_app(preview, clock=lambda: now[0]), base_url='http://localhost', client=('127.0.0.1', 8000)) as client:
        yield client


def admin_headers(client):
    return {'Authorization': 'Bearer ' + login(client, 'owner@example.com')['token']}


def test_seed_is_public_localized_and_has_no_account_identity(client, now):
    zh = client.get('/updates?locale=zh')
    assert zh.status_code == 200
    data = zh.json()
    assert {key: data[key] for key in ('page', 'pageSize', 'total', 'totalPages')} == dict(page=1, pageSize=10, total=1, totalPages=1)
    item = data['updates'][0]
    assert set(item) == {'id', 'body', 'createdAt', 'updatedAt'}
    assert item['body'] == SEED_ZH
    assert item['createdAt'] == item['updatedAt'] == now[0].isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    assert client.get('/updates?locale=en').json()['updates'][0]['body'] == SEED_EN
    assert zh.headers['cache-control'] == 'no-store'
    assert 'Owner Example' not in zh.text and 'owner@example.com' not in zh.text
    assert client.get('/updates', headers={'Authorization': 'Bearer invalid'}).status_code == 200


@pytest.mark.parametrize('method,path,payload', [
    ('GET', '/admin/updates', None), ('POST', '/admin/updates', {'bodyZh': '动态'}),
    ('PATCH', '/admin/updates/missing', {'bodyZh': '动态'}), ('DELETE', '/admin/updates/missing', {}),
])
def test_admin_source_reads_and_mutations_require_admin(client, method, path, payload):
    kwargs = {'json': payload} if payload is not None else {}
    assert client.request(method, path, **kwargs).status_code == 401
    member = login(client)
    assert client.request(method, path, headers={'Authorization': 'Bearer ' + member['token'], 'X-Role': 'admin'}, **kwargs).status_code == 403


def test_crud_keeps_created_date_plain_text_and_locale_fallback(client, now):
    headers = admin_headers(client)
    now[0] += timedelta(seconds=1)
    text = "<script>alert('hi')</script>'; DROP TABLE users; --"
    response = client.post('/admin/updates', json={'bodyZh': '  ' + text + '  ', 'bodyEn': ' English\nline '}, headers=headers)
    assert response.status_code == 201
    item = response.json()
    assert set(item) == {'id', 'body', 'bodyZh', 'bodyEn', 'createdAt', 'updatedAt'}
    assert item['body'] == item['bodyZh'] == text and item['bodyEn'] == 'English\nline'
    assert client.get('/updates?locale=en').json()['updates'][0]['body'] == 'English\nline'
    now[0] += timedelta(seconds=2)
    updated = client.patch('/admin/updates/' + item['id'], json={'bodyZh': '改写\n第二行'}, headers=headers)
    assert updated.status_code == 200
    edited = updated.json()
    assert edited['createdAt'] == item['createdAt']
    assert edited['updatedAt'] != item['updatedAt']
    assert edited['bodyEn'] == '' and edited['bodyZh'] == '改写\n第二行'
    assert client.get('/updates?locale=en').json()['updates'][0]['body'] == edited['bodyZh']
    sources = client.get('/admin/updates?locale=en', headers=headers).json()['updates']
    assert sources[0] == edited
    assert client.get('/auth/me', headers=headers).status_code == 200
    deleted = client.request('DELETE', '/admin/updates/' + item['id'], json={}, headers=headers)
    assert deleted.status_code == 204 and deleted.content == b''
    assert client.get('/updates').json()['total'] == 1
    assert client.patch('/admin/updates/' + item['id'], json={'bodyZh': 'missing'}, headers=headers).status_code == 404
    assert client.request('DELETE', '/admin/updates/' + item['id'], json={}, headers=headers).status_code == 404


def test_cookie_writes_require_trusted_origin_and_invalid_bearer_never_falls_back(client):
    admin_headers(client)
    assert client.get('/admin/updates').status_code == 200
    for method, path, payload in [('POST', '/admin/updates', {'bodyZh': '新动态'}),
                                  ('PATCH', '/admin/updates/missing', {'bodyZh': '改写'}),
                                  ('DELETE', '/admin/updates/missing', {})]:
        assert client.request(method, path, json=payload).status_code == 403
        assert client.request(method, path, json=payload, headers={'Origin': 'https://evil.invalid'}).status_code == 403
        assert client.request(method, path, json=payload, headers={'Origin': 'http://localhost:4321', 'Authorization': 'Bearer invalid'}).status_code == 401
    trusted = {'Origin': 'http://localhost:4321'}
    item = client.post('/admin/updates', json={'bodyZh': '新动态'}, headers=trusted).json()
    assert client.patch('/admin/updates/' + item['id'], json={'bodyZh': '改写'}, headers=trusted).status_code == 200
    assert client.request('DELETE', '/admin/updates/' + item['id'], json={}, headers=trusted).status_code == 204


def test_page_size_ten_newest_first_edit_does_not_reorder_and_page_clamps(client, now):
    headers = admin_headers(client)
    ids = []
    for index in range(21):
        now[0] += timedelta(seconds=1)
        response = client.post('/admin/updates', json={'bodyZh': str(index)}, headers=headers)
        assert response.status_code == 201
        ids.append(response.json()['id'])
    now[0] += timedelta(seconds=1)
    assert client.patch('/admin/updates/' + ids[0], json={'bodyZh': 'edited oldest'}, headers=headers).status_code == 200
    seen = []
    for page in range(1, 4):
        public = client.get('/updates', params={'page': page}).json()
        admin = client.get('/admin/updates', params={'page': page}, headers=headers).json()
        assert public['total'] == admin['total'] == 22
        assert public['totalPages'] == 3 and public['pageSize'] == 10
        assert len(public['updates']) == (10 if page < 3 else 2)
        assert [row['id'] for row in public['updates']] == [row['id'] for row in admin['updates']]
        seen.extend(row['id'] for row in public['updates'])
    assert seen[:-1] == list(reversed(ids)) and len(set(seen)) == 22
    assert client.get('/updates?page=99').json()['page'] == 3
    assert len(client.get('/updates?pageSize=3').json()['updates']) == 3


@pytest.mark.parametrize('payload', [
    {}, {'bodyZh': ''}, {'bodyZh': '   '}, {'bodyZh': '中' * 1501},
    {'bodyZh': 123}, {'bodyZh': None}, {'bodyZh': '好', 'bodyEn': None},
    {'bodyZh': '好', 'bodyEn': 'e' * 3001}, {'bodyZh': '好', 'role': 'admin'}, [],
])
def test_validation_rejects_invalid_source_fields_without_mutation(client, payload):
    headers = admin_headers(client)
    item = client.get('/updates').json()['updates'][0]
    for method, path in [('POST', '/admin/updates'), ('PATCH', '/admin/updates/' + item['id'])]:
        response = client.request(method, path, json=payload, headers=headers)
        assert response.status_code == 422
        assert response.json() == {'error': 'Check the submitted fields and lengths.'}
    assert client.get('/updates').json()['updates'] == [item]


def test_source_length_limits_allow_boundary_values(client):
    headers = admin_headers(client)
    assert client.post('/admin/updates', json={'bodyZh': ' 中 ', 'bodyEn': ' '}, headers=headers).status_code == 201
    assert client.post('/admin/updates', json={'bodyZh': '中' * 1500, 'bodyEn': 'e' * 3000}, headers=headers).status_code == 201


@pytest.mark.parametrize('query', ['page=0', 'page=-1', 'page=abc', 'page=100001', 'pageSize=0', 'pageSize=11', 'locale=fr'])
def test_pagination_and_locale_are_validated(client, query):
    assert client.get('/updates?' + query).status_code == 422
    assert client.get('/admin/updates?' + query, headers=admin_headers(client)).status_code == 422


@pytest.mark.parametrize('method', ['PATCH', 'DELETE'])
def test_mutations_require_json_bound_streamed_bodies_and_allow_cors(client, method):
    headers = admin_headers(client)
    path = '/admin/updates/' + client.get('/updates').json()['updates'][0]['id']
    assert client.request(method, path, content='{}', headers={**headers, 'Content-Type': 'text/plain'}).status_code == 415
    for content in [b'x' * 8193, (chunk for chunk in [b'x' * 4096] * 3)]:
        assert client.request(method, path, content=content, headers={**headers, 'Content-Type': 'application/json'}).status_code == 413
    assert client.request(method, path, content='{', headers={**headers, 'Content-Type': 'application/json'}).status_code == 422
    preflight = client.options(path, headers={'Origin': 'http://localhost:4321', 'Access-Control-Request-Method': method, 'Access-Control-Request-Headers': 'authorization,content-type'})
    assert preflight.status_code == 200
    assert method in preflight.headers['access-control-allow-methods']


def test_restart_persists_updates_sessions_legacy_data_and_never_resurrects_seed(preview, now):
    with sqlite3.connect(preview.db_path) as db:
        db.execute('CREATE TABLE messages (id TEXT PRIMARY KEY,name TEXT NOT NULL,message TEXT NOT NULL,created_at TEXT NOT NULL)')
        db.execute('INSERT INTO messages VALUES (?,?,?,?)', ('legacy', 'Legacy', 'Keep me', '2026-01-01T00:00:00Z'))
    with TestClient(create_app(preview, clock=lambda: now[0]), base_url='http://localhost', client=('127.0.0.1', 8000)) as first:
        headers = admin_headers(first)
        seed = first.get('/updates').json()['updates'][0]
        item = first.post('/admin/updates', json={'bodyZh': '持久化', 'bodyEn': 'Persistent'}, headers=headers).json()
        assert first.request('DELETE', '/admin/updates/' + seed['id'], json={}, headers=headers).status_code == 204
    now[0] += timedelta(minutes=1)
    with TestClient(create_app(preview, clock=lambda: now[0])) as second:
        assert second.get('/updates').json()['updates'] == [{key: item[key] for key in ('id', 'body', 'createdAt', 'updatedAt')}]
        assert second.get('/admin/updates', headers=headers).json()['updates'] == [item]
        assert second.request('DELETE', '/admin/updates/' + item['id'], json={}, headers=headers).status_code == 204
    with TestClient(create_app(preview, clock=lambda: now[0])) as third:
        assert third.get('/updates?page=99').json() == dict(updates=[], page=1, pageSize=10, total=0, totalPages=1)
        with sqlite3.connect(preview.db_path) as db:
            assert db.execute('SELECT message FROM messages WHERE id=?', ('legacy',)).fetchone()[0] == 'Keep me'
