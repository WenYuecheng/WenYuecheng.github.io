import sqlite3

import pytest
from fastapi.testclient import TestClient

from app import Settings, create_app


def seed(db_path, count=73):
    with sqlite3.connect(db_path) as db:
        db.executemany('INSERT INTO messages(id,name,message,created_at,status) VALUES (?,?,?,?,?)',
                       [(f'n-{i}', 'Visitor', f'Note {i}', '2026-10-27T00:00:00Z', 'approved') for i in range(count)])
        for status in ('pending', 'rejected'):
            db.execute('INSERT INTO messages(id,name,message,created_at,status) VALUES (?,?,?,?,?)',
                       (status, 'Private', 'Do not disclose', '2026-10-28T00:00:00Z', status))


def test_public_pagination_reaches_all_older_notes_and_never_counts_private_rows(tmp_path):
    path = tmp_path / 'db.sqlite3'
    with TestClient(create_app(Settings(db_path=path))) as client:
        seed(path)
        seen = []
        for page in range(1, 8):
            response = client.get('/messages', params={'page': page, 'pageSize': 12})
            assert response.status_code == 200
            data = response.json()
            assert data['total'] == 73 and data['totalPages'] == 7 and data['page'] == page
            assert data['pageSize'] == 12 and len(data['messages']) <= 12
            for item in data['messages']:
                assert set(item) == {'id', 'name', 'message', 'createdAt'}
                assert item['id'] not in ('pending', 'rejected')
                seen.append(item['id'])
        assert len(set(seen)) == len(seen) == 73
        assert seen == [f'n-{i}' for i in reversed(range(73))]
        # Existing clients remain compatible while the site switches to page queries.
        assert set(client.get('/messages').json()) == {'messages'}
        assert len(client.get('/messages').json()['messages']) == 60


def test_public_page_is_clamped_after_notes_are_unpublished_and_empty_is_valid(tmp_path):
    path = tmp_path / 'db.sqlite3'
    with TestClient(create_app(Settings(db_path=path))) as client:
        assert client.get('/messages?page=9').json() == {'messages': [], 'page': 1, 'pageSize': 12, 'total': 0, 'totalPages': 1}
        seed(path)
        with sqlite3.connect(path) as db:
            db.execute("UPDATE messages SET status='rejected' WHERE rowid<=13")
        data = client.get('/messages?page=7').json()
        assert data['total'] == 60 and data['totalPages'] == 5 and data['page'] == 5
        assert len(data['messages']) == 12


@pytest.mark.parametrize('query', ['page=0', 'page=-1', 'page=100001', 'page=abc', 'page=1%20OR%201=1', 'page=1&pageSize=0', 'page=1&pageSize=25'])
def test_pagination_bounds_and_query_validation(tmp_path, query):
    with TestClient(create_app(Settings(db_path=tmp_path / 'db.sqlite3'))) as client:
        assert client.get('/messages?' + query).status_code == 422
