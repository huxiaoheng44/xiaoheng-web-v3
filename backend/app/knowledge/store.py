"""Index public portfolio HTML and explicitly approved supplementary knowledge."""
import hashlib
import re
import sqlite3
from html.parser import HTMLParser
import jieba
from ..core.config import ROOT
from .github_source import fetch_current_snapshot, source_records

DB = ROOT / 'backend' / 'data' / 'knowledge.sqlite'

def tokens(text):
    return ' '.join(t.lower() for t in jieba.lcut(text) if re.search(r'[\w\u4e00-\u9fff]', t))

def portfolio_record(**record):
    return {'sourceType':'portfolio', 'repository':'', 'branch':'', 'path':'', 'url':'', **record}

class ProjectPageParser(HTMLParser):
    """Extract visible project text, grouping each page by its h2 headings."""
    ignored_tags = {'script', 'style', 'noscript', 'nav'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.page_title = ''
        self.h1 = ''
        self.preamble = []
        self.sections = []
        self.current_title = ''
        self.current_text = []
        self.capture = None
        self.capture_text = []
        self.ignored_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.ignored_tags:
            self.ignored_depth += 1
            return
        if not self.ignored_depth and tag in {'title', 'h1', 'h2'}:
            self.capture = tag
            self.capture_text = []

    def handle_endtag(self, tag):
        if tag in self.ignored_tags:
            self.ignored_depth = max(0, self.ignored_depth - 1)
            return
        if self.ignored_depth or tag != self.capture:
            return
        text = ' '.join(''.join(self.capture_text).split())
        if tag == 'title':
            self.page_title = text
        elif tag == 'h1':
            self.h1 = text
            self.preamble.append(text)
        elif tag == 'h2':
            self._flush_section()
            self.current_title = text
        self.capture = None
        self.capture_text = []

    def handle_data(self, data):
        if self.ignored_depth:
            return
        text = ' '.join(data.split())
        if not text:
            return
        if self.capture:
            self.capture_text.append(text)
        else:
            (self.current_text if self.current_title else self.preamble).append(text)

    def _flush_section(self):
        text = ' '.join(self.current_text).strip()
        if self.current_title and text:
            self.sections.append((self.current_title, text))
        self.current_text = []

    def finish(self):
        self._flush_section()
        return self.page_title or self.h1, ' '.join(self.preamble).strip(), self.sections

def html_records(root):
    pages = root / 'content' / 'html'
    for path in sorted(pages.glob('*/*.html')):
        if path.name == 'index.html' or path.parent.name not in {'en', 'zh'}:
            continue
        parser = ProjectPageParser()
        parser.feed(path.read_text(encoding='utf-8'))
        parser.close()
        page_title, summary, sections = parser.finish()
        if not page_title:
            continue
        language = path.parent.name
        project = path.stem
        source = str(path.relative_to(root)).replace('\\', '/')
        if summary:
            yield portfolio_record(id=f'{language}:{project}:summary', title=page_title, text=summary, target=f'project:{project}', language=language, source=source)
        for index, (heading, text) in enumerate(sections):
            yield portfolio_record(id=f'{language}:{project}:section-{index}', title=f'{page_title} / {heading}', text=text, target=f'project:{project}:section-{index}', language=language, source=source)

def records(root=ROOT, github_snapshot=None):
    yield from html_records(root)
    for path in sorted((root/'knowledge').glob('*.md')):
        raw=path.read_text(encoding='utf-8')
        if not re.match(r'^---\s*\npublic:\s*true\s*\n---',raw): continue
        body=re.sub(r'^---.*?---\s*','',raw,count=1,flags=re.S)
        for i, part in enumerate(re.split(r'(?=^## )',body,flags=re.M)):
            if part.strip(): yield portfolio_record(id=f'extra:{path.stem}:{i}',title=part.splitlines()[0].lstrip('# '),text=part,target='',language='mixed',source=f'knowledge/{path.name}')
    if github_snapshot:
        yield from source_records(*github_snapshot)

def build(root=ROOT, db=DB, github_snapshot=None, include_github=False):
    if include_github:
        github_snapshot = fetch_current_snapshot()
    db.parent.mkdir(parents=True,exist_ok=True)
    with sqlite3.connect(db) as conn:
        conn.executescript('DROP TABLE IF EXISTS chunks; DROP TABLE IF EXISTS search; CREATE TABLE chunks(id TEXT PRIMARY KEY,title TEXT,text TEXT,target TEXT,language TEXT,source TEXT,sourceType TEXT,repository TEXT,branch TEXT,path TEXT,url TEXT,version TEXT); CREATE VIRTUAL TABLE search USING fts5(id UNINDEXED,title,body);')
        for r in records(root, github_snapshot):
            version=hashlib.sha256(r['text'].encode()).hexdigest()[:12]
            conn.execute('INSERT INTO chunks VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',(r['id'],r['title'],r['text'],r['target'],r['language'],r['source'],r['sourceType'],r['repository'],r['branch'],r['path'],r['url'],version))
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
    build(include_github=True)
    print(f'Public portfolio and current GitHub source snapshot indexed: {DB}')
