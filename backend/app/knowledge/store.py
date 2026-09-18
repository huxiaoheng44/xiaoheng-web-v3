"""Only explicitly approved content is indexed. No attachment/directory crawling."""
import hashlib
import json
import re
import sqlite3
from pathlib import Path
import jieba
from ..core.config import ROOT

PROJECTS = ['3d-reconstruction','drone-simulator','fast-ai-movie','vehicle-identification']
DB = ROOT / 'backend' / 'data' / 'knowledge.sqlite'
EXCLUDED = {'Portfolio copy', '网页文案草案', '待补充信息'}

def tokens(text):
    return ' '.join(t.lower() for t in jieba.lcut(text) if re.search(r'[\w\u4e00-\u9fff]', t))

def section_id(index):
    return f'section-{index}'

def records(root=ROOT):
    profile = json.loads((root/'content/profile.json').read_text(encoding='utf-8'))
    for key in ['summary','experience','education','skills','projects','languages']:
        tab = {'summary':'profile','projects':'research','languages':'profile'}.get(key,key)
        yield dict(id=f'profile:{key}', title=f'Xiaoheng Hu / {key}', text=json.dumps(profile[key], ensure_ascii=False), target=f'about:{tab}', language='en', source='Public profile')
    yield dict(id='profile:contact',title='Contact / 联系方式',text=json.dumps({k:profile[k] for k in ['name','location','email','linkedIn']},ensure_ascii=False),target='folder:contact',language='en',source='Public profile')
    for project in PROJECTS:
        for lang, prefix in [('zh',''),('en','en/')]:
            path=root/f'content/projects/{prefix}{project}.md'
            raw=path.read_text(encoding='utf-8')
            sections=re.split(r'(?=^## )',raw,flags=re.M)
            body_index=0
            for section in sections:
                if not section.startswith('## '): continue
                title, _, text=section[3:].partition('\n')
                if title.strip() in EXCLUDED: continue
                summary=title.strip() in ['Summary','一句话简介']
                target=f'project:{project}' if summary else f'project:{project}:{section_id(body_index)}'
                if not summary: body_index+=1
                text=re.sub(r'!\[.*?\]\(.*?\)', '', text)
                yield dict(id=f'{lang}:{project}:{title.strip()}',title=f'{project} / {title.strip()}',text=text.strip(),target=target,language=lang,source=str(path.relative_to(root)).replace('\\','/'))
    for path in sorted((root/'knowledge').glob('*.md')):
        raw=path.read_text(encoding='utf-8')
        if not re.match(r'^---\s*\npublic:\s*true\s*\n---',raw): continue
        body=re.sub(r'^---.*?---\s*','',raw,count=1,flags=re.S)
        for i, part in enumerate(re.split(r'(?=^## )',body,flags=re.M)):
            if part.strip(): yield dict(id=f'extra:{path.stem}:{i}',title=part.splitlines()[0].lstrip('# '),text=part,target='',language='mixed',source=f'knowledge/{path.name}')

def build(root=ROOT, db=DB):
    db.parent.mkdir(parents=True,exist_ok=True)
    with sqlite3.connect(db) as conn:
        conn.executescript('DROP TABLE IF EXISTS chunks; DROP TABLE IF EXISTS search; CREATE TABLE chunks(id TEXT PRIMARY KEY,title TEXT,text TEXT,target TEXT,language TEXT,source TEXT,version TEXT); CREATE VIRTUAL TABLE search USING fts5(id UNINDEXED,title,body);')
        for r in records(root):
            version=hashlib.sha256(r['text'].encode()).hexdigest()[:12]
            conn.execute('INSERT INTO chunks VALUES (?,?,?,?,?,?,?)',(*r.values(),version))
            conn.execute('INSERT INTO search VALUES (?,?,?)',(r['id'],tokens(r['title']),tokens(r['text'])))

class Knowledge:
    def __init__(self, db=DB): self.db=db
    def read(self, ident):
        with sqlite3.connect(self.db) as conn:
            conn.row_factory=sqlite3.Row
            r=conn.execute('SELECT * FROM chunks WHERE id=?',(ident,)).fetchone()
            return dict(r) if r else None
    def search(self, query):
        terms=list(dict.fromkeys(tokens(query).split()))[:30]
        if not terms: return []
        match=' OR '.join('"'+t.replace('"','""')+'"' for t in terms)
        with sqlite3.connect(self.db) as conn:
            rows=conn.execute('SELECT id FROM search WHERE search MATCH ? ORDER BY bm25(search,0,5,1) LIMIT 6',(match,)).fetchall()
        return [self.read(r[0]) for r in rows]

if __name__ == '__main__':
    build()
    print(f'Public knowledge indexed: {DB}')
