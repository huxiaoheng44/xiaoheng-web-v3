"""Index public portfolio HTML and explicitly approved supplementary knowledge."""
import hashlib
import logging
import os
import tempfile
import time
from contextlib import closing
from pathlib import Path
import re
import sqlite3
from html.parser import HTMLParser
import jieba
from ..core.config import ROOT
from .vectors import VectorIndex, populate
from .project_catalog import CATALOG, TOPICS
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

def build(root=ROOT, db=DB, github_snapshot=None, include_github=False, *, semantic=True, embedder=None):
    if include_github:
        github_snapshot = fetch_current_snapshot()
    db = Path(db)
    db.parent.mkdir(parents=True, exist_ok=True)
    rows = sorted(records(root, github_snapshot), key=lambda row: row['id'])
    handle, temporary = tempfile.mkstemp(prefix='index-', suffix='.sqlite', dir=db.parent)
    os.close(handle)
    try:
        with closing(sqlite3.connect(temporary)) as conn, conn:
            conn.executescript('CREATE TABLE chunks(id TEXT PRIMARY KEY,title TEXT,text TEXT,target TEXT,language TEXT,source TEXT,sourceType TEXT,repository TEXT,branch TEXT,path TEXT,url TEXT,version TEXT); CREATE VIRTUAL TABLE search USING fts5(id UNINDEXED,title,body);')
            for r in rows:
                version=hashlib.sha256(r['text'].encode()).hexdigest()[:12]
                conn.execute('INSERT INTO chunks VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',(r['id'],r['title'],r['text'],r['target'],r['language'],r['source'],r['sourceType'],r['repository'],r['branch'],r['path'],r['url'],version))
                conn.execute('INSERT INTO search VALUES (?,?,?)',(r['id'],tokens(r['title']),tokens(r['text'])))
            if semantic:
                populate(conn, rows, embedder)
        os.replace(temporary, db)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def build_vectors(db=DB, embedder=None):
    """Upgrade existing evidence in one transaction, preserving GitHub sources."""
    if not Path(db).exists():
        return build(db=db, embedder=embedder)
    with sqlite3.connect(db) as conn:
        conn.row_factory = sqlite3.Row
        rows = [dict(r) for r in conn.execute('SELECT * FROM chunks ORDER BY id')]
        populate(conn, rows, embedder)


class Knowledge:
    def __init__(self, db=DB, *, embedder=None):
        self.db=Path(db)
        self.vectors=VectorIndex(self.db, embedder)
        self._retry_at=0

    def semantic_search(self, query, limit=8):
        if not query.strip():
            return []
        with sqlite3.connect(self.db) as conn:
            ranked=self.vectors.search(query, conn, limit)
            return [(self.read(ident), score) for ident, score in ranked]

    def project_candidates(self, query):
        """Return possible project matches, never a navigation instruction."""
        if time.monotonic() < self._retry_at:
            return []
        try:
            matches = self.semantic_search(query, 32)
        except Exception as exc:
            self.vectors.state='embedding-unavailable'
            self._retry_at=time.monotonic()+30
            logging.getLogger(__name__).warning('Project vector retrieval unavailable (%s)', type(exc).__name__)
            return []
        projects={}; known={entry['id'] for entry in CATALOG}
        for row, score in matches:
            if not row or not row['target'].startswith('project:'):
                continue
            project=row['target'].split(':')[1]
            project='drone-simulator' if project=='drone' else project
            if project in known:
                projects[project]=max(projects.get(project,-1),score)
        if not projects:
            return []
        best=max(projects.values())
        # Cosine is not a probability. These are suggestions for confirmation,
        # constrained to the published catalog, never an automatic destination.
        return [ident for ident,score in sorted(projects.items(),key=lambda p:-p[1]) if score>=max(.83,best-.025)][:3]

    def retrieval_status(self):
        return {'mode':'hybrid' if self.vectors.state=='ready' else 'pending' if self.vectors.state=='not-loaded' else 'lexical', 'vectors':self.vectors.state, 'model':self.vectors.embedder.model_id}

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
            rows=conn.execute('SELECT id FROM search WHERE search MATCH ? ORDER BY bm25(search,0,5,1) LIMIT 32',(match,)).fetchall()
            dense=[]
            if time.monotonic() >= self._retry_at:
                try:
                    dense=self.vectors.search(query, conn)
                except Exception as exc:
                    self.vectors.state='embedding-unavailable'
                    self._retry_at=time.monotonic()+30
                    logging.getLogger(__name__).warning('Vector search unavailable (%s); using lexical evidence', type(exc).__name__)
        # Reciprocal rank fusion: scores from BM25 and cosine need not share a scale.
        scores={}
        for weight, ranking in [(1.0,[r[0] for r in rows]),(1.5,[ident for ident, _ in dense])]:
            for rank, ident in enumerate(ranking,1):
                scores[ident]=scores.get(ident,0)+weight/(60+rank)
        ordered=sorted(scores,key=lambda ident:(-scores[ident],ident))
        ranked=[];groups={};seen=set()
        for ident in ordered:
            row=self.read(ident)
            if not row:
                continue
            # Deduplicate translated versions of the same portfolio section.
            key=ident.split(':',1)[1] if row['sourceType']=='portfolio' and ident.startswith(('en:','zh:')) else ident
            group=row['target'].split(':')[1] if row['target'].startswith('project:') else row['source']
            if key in seen or groups.get(group,0)>=2:
                continue
            seen.add(key);groups[group]=groups.get(group,0)+1;ranked.append(row)
            if len(ranked)>=8:
                break
        # Topic retrieval supplements lexical ranking with one factual overview
        # per matching project, so repeated chunks cannot crowd out other work.
        topics = [name for name, pattern in TOPICS.items() if re.search(pattern, query, re.I)]
        if topics:
            locale = 'zh' if re.search(r'[\u3400-\u9fff]', query) else 'en'
            summaries = []
            for entry in CATALOG:
                if not any(topic in entry['topics'] for topic in topics):
                    continue
                document = 'drone' if entry['id'] == 'drone-simulator' else entry['id']
                overview = self.read(f'{locale}:{document}:summary')
                if overview:
                    summaries.append(overview)
            # Project discovery favors breadth; detailed questions retain their
            # lexical evidence and gain semantic overviews when space permits.
            discovery = re.search(r'项目|作品|\bprojects?\b', query, re.I) or query.strip().casefold() in TOPICS
            combined = summaries + ranked if discovery else ranked[:3] + summaries + ranked[3:]
            unique = {row['id']: row for row in reversed(combined)}
            return [unique[ident] for ident in dict.fromkeys(row['id'] for row in combined)][:8]
        return ranked

if __name__ == '__main__':
    import sys
    if '--vectors-only' in sys.argv:
        build_vectors()
    else:
        build(include_github='--local' not in sys.argv)
    print(f'Knowledge index ready: {DB}')
