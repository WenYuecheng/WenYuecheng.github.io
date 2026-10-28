import json
from dataclasses import replace

import pytest
from fastapi.testclient import TestClient
from app import create_app
from test_auth import preview, login


@pytest.fixture
def content_settings(preview, tmp_path):
    root = tmp_path / 'private'
    root.mkdir(exist_ok=True)
    (root / 'portrait.webp').write_bytes(b'private image')
    (root / 'emblem.jpg').write_bytes(b'private emblem')
    project = dict(slug='sample', tags=['AI'], coverAsset='weyra', backdrop='/garden.webp', accent='lilac', links=[], en=dict(title='Project', kicker='Hello', summary='Summary', description='Details', role='Owner', walkthrough=['Private explanation'], architecture=['Runtime'], features=[], stages=[], metrics=['SECRET'], notes=['SECRET'], scope='SECRET'), zh=dict(title='项目', kicker='你好', summary='概要', description='详情', role='作者', walkthrough=['私密说明'], architecture=[], features=[], stages=[]))
    config = dict(ownerEmail='private-owner@example.com', identity={'en':'Owner Example', 'zh':'示例作者'}, home={locale:dict(profile={'text':'Profile'}, education={'current':'School', 'values':['A','B','C','D'], 'courses':['secret'], 'coursework':'secret'}, interests=[]) for locale in ('en','zh')}, projects=[project], assets={'portrait':'portrait.webp', 'emblem':'emblem.jpg'}, github='https://github.com/example', csdn='https://blog.csdn.net/example', projectLinks={'weyra':{'github':'https://github.com/example/project'}})
    (root / 'content.json').write_text(json.dumps(config))
    return replace(preview, content_dir=root)


def test_content_is_authenticated_role_filtered_and_revoked(content_settings):
    with TestClient(create_app(content_settings), base_url='http://localhost', client=('127.0.0.1',8000)) as c:
        for path in ['/content/home', '/content/projects', '/content/projects/sample', '/content/assets/portrait']:
            assert c.get(path, headers={'X-Role':'admin'}).status_code == 401
        member=login(c)
        headers={'Authorization':'Bearer '+member['token'], 'X-Role':'admin'}
        home=c.get('/content/home?locale=zh',headers=headers)
        assert home.json()['name']=='Owner Example'
        assert home.json()['education']['values']==['A','B','C','D']
        assert home.json()['contact']=={'csdn':'https://blog.csdn.net/example','email':content_settings.admin_email}
        assert 'github' not in home.json()['contact']
        assert 'courses' not in home.json()['education'] and 'coursework' not in home.json()['education']
        project=c.get('/content/projects/sample?role=admin',headers=headers).json()['project']
        assert project['title']=='Project'
        assert not set(project)&{'role','architecture','features','stages','walkthrough','metrics','notes','scope'}
        assert c.get('/content/projects',headers=headers).json()=={'projects':[project]}
        assert c.get('/content/projects/missing',headers=headers).status_code==404
        image=c.get('/content/assets/portrait',headers=headers)
        assert image.content==b'private image'
        emblem=c.get('/content/assets/emblem',headers=headers)
        assert emblem.content==b'private emblem' and emblem.headers['content-type']=='image/jpeg'
        c.cookies.clear()
        assert c.get('/content/assets/emblem').status_code==401
        assert image.headers['cache-control']=='private, no-store'
        assert 'Authorization' in image.headers['vary']
        assert c.get('/content/assets/content.json',headers=headers).status_code==404
        admin=login(c,'owner@example.com')
        ah={'Authorization':'Bearer '+admin['token']}
        p=c.get('/content/projects/sample?locale=zh',headers=ah).json()['project']
        assert p['role']=='作者' and 'metrics' not in p
        assert p['walkthrough']==['私密说明']
        assert c.get('/auth/me?locale=zh',headers=ah).json()['user']['nickname']=='示例作者'
        assert c.get('/content/home?locale=zh',headers=ah).json()['name']=='示例作者'
        assert c.get('/content/home',headers=ah).json()['contact']['email']=='private-owner@example.com'
        assert c.get('/content/home?locale=en',headers=ah).json()['name']=='Owner Example'
        c.post('/auth/logout',json={},headers=headers)
        assert c.get('/content/home',headers=headers).status_code==401


def test_content_missing_fails_closed(preview):
    preview = replace(preview, content_dir=None)
    with TestClient(create_app(preview), base_url='http://localhost', client=('127.0.0.1',8000)) as c:
        token=login(c)['token']
        headers={'Authorization':'Bearer '+token}
        for path in ['/content/home','/content/projects','/content/assets/portrait','/profile/links/github']:
            assert c.get(path,headers=headers).status_code==503


def test_asset_configuration_cannot_escape_root(content_settings, tmp_path):
    config_path=content_settings.content_dir/'content.json'
    config=json.loads(config_path.read_text())
    (tmp_path/'secret.webp').write_bytes(b'secret')
    config['assets']['portrait']='../secret.webp'
    config_path.write_text(json.dumps(config))
    with TestClient(create_app(content_settings), base_url='http://localhost', client=('127.0.0.1',8000)) as c:
        headers={'Authorization':'Bearer '+login(c)['token']}
        assert c.get('/content/assets/portrait',headers=headers).status_code==503


def test_owner_wall_names_follow_viewer_and_locale(content_settings):
    import sqlite3
    with TestClient(create_app(content_settings), base_url='http://localhost', client=('127.0.0.1',8000)) as c:
        owner=login(c,'owner@example.com')
        member=login(c)
        with sqlite3.connect(content_settings.db_path) as db:
            db.execute('INSERT INTO messages(id,name,message,created_at,user_id,status) VALUES (?,?,?,?,?,?)', ('owner', 'Old owner', 'Hello', '2026-10-27T00:00:00Z',owner['user']['id'],'approved'))
            db.execute('INSERT INTO messages(id,name,message,created_at,user_id,status) VALUES (?,?,?,?,?,?)', ('member', 'Chosen name', 'Hi', '2026-10-26T00:00:00Z',member['user']['id'],'approved'))
        def names(token=None, locale='en'):
            headers={'Authorization':'Bearer '+token} if token else {}
            return [m['name'] for m in c.get('/messages?locale='+locale,headers=headers).json()['messages']]
        assert c.get('/messages').headers['cache-control']=='no-store'
        assert 'Authorization' in c.get('/messages').headers['vary']
        assert c.get('/messages',headers={'Authorization':'Bearer '+owner['token']}).headers['cache-control']=='no-store'
        c.cookies.clear()
        assert names()==['Eugene',member['user']['nickname']]
        assert names(member['token'],'zh')==['Owner Example','访客'+member['user']['nickname'][-8:]]
        assert names(owner['token'],'zh')==['示例作者','访客'+member['user']['nickname'][-8:]]
        assert names(owner['token'],'en')==['Owner Example',member['user']['nickname']]
        assert c.get('/messages',headers={'Authorization':'Bearer expired'}).status_code==401
        assert c.get('/messages/mine?locale=zh',headers={'Authorization':'Bearer '+owner['token']}).json()['messages'][0]['name']=='示例作者'


def test_assets_reject_symlinks_unknown_ids_and_invalid_locales(content_settings, tmp_path):
    outside=tmp_path/'outside.webp'
    outside.write_bytes(b'outside secret')
    config_path=content_settings.content_dir/'content.json'
    config=json.loads(config_path.read_text())
    (content_settings.content_dir/'linked.webp').symlink_to(outside)
    config['assets']['portrait']='linked.webp'
    config['assets']['extra']='portrait.webp'
    config_path.write_text(json.dumps(config))
    with TestClient(create_app(content_settings), base_url='http://localhost', client=('127.0.0.1',8000)) as c:
        headers={'Authorization':'Bearer '+login(c)['token']}
        assert c.get('/content/assets/portrait',headers=headers).status_code==503
        assert c.get('/content/assets/extra',headers=headers).status_code==404
        assert c.get('/content/home?locale=fr',headers=headers).status_code==422
        assert c.get('/content/projects?locale=fr',headers=headers).status_code==422
        assert c.get('/content/home',headers=headers).headers['cache-control']=='private, no-store'
