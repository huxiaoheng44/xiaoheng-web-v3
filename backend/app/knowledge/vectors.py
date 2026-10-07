"""Persistent cosine search for the small public portfolio corpus.

Vectors share a transaction with the document index. Overlapping windows keep
late section content retrievable without changing citation IDs.
"""
import hashlib
import json
import sqlite3
from threading import RLock
import numpy as np
from .embeddings import default_embedder, unit

FORMAT = 'token-windows-512-overlap-64-v2'


def windows(title, text):
    title = title[:160]
    for start in range(0, max(1, len(text)), 680):
        yield f'{title}\n{text[start:start + 800]}'
        if start + 800 >= len(text):
            break


def fingerprint(rows):
    return hashlib.sha256(json.dumps([(r['id'], r['title'], r['text']) for r in rows], ensure_ascii=False).encode()).hexdigest()


def populate(conn, rows, embedder=None):
    encoder = embedder or default_embedder()
    split = getattr(encoder, 'windows', windows)
    passages = [(r['id'], i, text) for r in rows for i, text in enumerate(split(r['title'], r['text']))]
    # Embedding failure leaves the previous index untouched.
    vectors = encoder.passages([p[2] for p in passages])
    if len(vectors) != len(passages) or not vectors:
        raise ValueError('Incomplete embedding batch')
    vectors = [unit(v) for v in vectors]
    dim = len(vectors[0])
    if any(len(v) != dim for v in vectors):
        raise ValueError('Embedding dimension mismatch')
    conn.execute('CREATE TABLE IF NOT EXISTS vectors(chunk_id TEXT, ordinal INTEGER, vector BLOB, PRIMARY KEY(chunk_id, ordinal))')
    conn.execute('CREATE TABLE IF NOT EXISTS vector_meta(key TEXT PRIMARY KEY, value TEXT)')
    conn.execute('DELETE FROM vectors')
    conn.execute('DELETE FROM vector_meta')
    conn.executemany('INSERT INTO vectors VALUES (?,?,?)', [(p[0], p[1], v.astype('<f4').tobytes()) for p, v in zip(passages, vectors)])
    conn.executemany('INSERT INTO vector_meta VALUES (?,?)', [
        ('model', encoder.model_id), ('dimension', str(dim)), ('format', FORMAT), ('corpus', fingerprint(rows)),
    ])


class VectorIndex:
    def __init__(self, db, embedder=None):
        self.db = db
        self.embedder = embedder or default_embedder()
        self._lock = RLock()
        self._stamp = None
        self._ids = []
        self._matrix = None
        self.state = 'not-loaded'

    def _load(self, conn):
        tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if not {'vectors', 'vector_meta'} <= tables:
            self.state = 'missing-index'
            return False
        meta = dict(conn.execute('SELECT key,value FROM vector_meta'))
        if meta.get('model') != self.embedder.model_id or meta.get('format') != FORMAT:
            self.state = 'incompatible-index'
            return False
        rows = conn.execute('SELECT id,title,text FROM chunks ORDER BY id').fetchall()
        if meta.get('corpus') != fingerprint([dict(zip(['id','title','text'], r)) for r in rows]):
            self.state = 'stale-index'
            return False
        entries = conn.execute('SELECT chunk_id,vector FROM vectors ORDER BY chunk_id,ordinal').fetchall()
        if not entries or {r[0] for r in entries} != {r[0] for r in rows}:
            self.state = 'incomplete-index'
            return False
        dim = int(meta['dimension'])
        vectors = [np.frombuffer(r[1], dtype='<f4') for r in entries]
        if any(len(v) != dim or not np.isfinite(v).all() or not np.isclose(np.linalg.norm(v), 1, atol=.001) for v in vectors):
            self.state = 'invalid-index'
            return False
        self._ids = [r[0] for r in entries]
        self._matrix = np.stack(vectors)
        self.state = 'ready'
        return True

    def search(self, query, conn, limit=32):
        with self._lock:
            stat = self.db.stat()
            stamp = (stat.st_mtime_ns, stat.st_size)
            if stamp != self._stamp:
                self._matrix = None
                if not self._load(conn):
                    return []
                self._stamp = stamp
            value = unit(self.embedder.query(query[:2000]))
            if self._matrix is None or len(value) != self._matrix.shape[1]:
                self.state = 'incompatible-query'
                return []
            scores = self._matrix @ value
            # Several windows may match one parent. Keep its best similarity.
            best = {}
            for ident, score in zip(self._ids, scores):
                best[ident] = max(best.get(ident, -1), float(score))
            self.state = 'ready'
            return sorted(best.items(), key=lambda pair: (-pair[1], pair[0]))[:limit]
