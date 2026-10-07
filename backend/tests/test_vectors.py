"""Deterministic storage/fusion tests; real-model recall has a separate eval."""
import sqlite3
import pytest
from backend.app.knowledge import store
from backend.app.knowledge.vectors import windows


class Encoder:
    model_id = 'test-semantic-v1'

    def passages(self, texts):
        return [[1, 0] if 'camera' in text else [0, 1] for text in texts]

    def query(self, text):
        return [1, 0]


@pytest.fixture
def corpus(tmp_path, monkeypatch):
    rows = [store.portfolio_record(id='en:camera:summary', title='Camera', text='camera reads a gauge', target='project:camera', language='en', source='content/camera.html'),
            store.portfolio_record(id='en:drone:summary', title='Drone', text='autonomous flight', target='project:drone', language='en', source='content/drone.html')]
    monkeypatch.setattr(store, 'records', lambda *args: iter(rows))
    db = tmp_path / 'kb.sqlite'
    store.build(db=db, embedder=Encoder())
    return db


def test_dense_retrieval_handles_no_shared_words_and_preserves_source(corpus):
    knowledge = store.Knowledge(corpus, embedder=Encoder())
    results = knowledge.search('仪表读数')
    assert results[0]['id'] == 'en:camera:summary'
    assert results[0]['source'] == 'content/camera.html'
    assert knowledge.retrieval_status()['mode'] == 'hybrid'
    assert knowledge.semantic_search('仪表')[0][1] == pytest.approx(1)


def test_embedding_outage_keeps_lexical_evidence_and_reports_degradation(corpus):
    class Broken(Encoder):
        def query(self, text):
            raise RuntimeError('private provider detail')
    knowledge = store.Knowledge(corpus, embedder=Broken())
    assert knowledge.search('autonomous flight')[0]['title'] == 'Drone'
    assert knowledge.retrieval_status()['vectors'] == 'embedding-unavailable'


def test_incompatible_model_never_compares_old_vectors(corpus):
    encoder = Encoder(); encoder.model_id = 'different-model'
    knowledge = store.Knowledge(corpus, embedder=encoder)
    assert knowledge.search('camera')[0]['title'] == 'Camera'
    assert knowledge.retrieval_status()['vectors'] == 'incompatible-index'


def test_changed_source_marks_index_stale_and_rebuild_restores_it(corpus):
    knowledge = store.Knowledge(corpus, embedder=Encoder())
    knowledge.search('camera')
    with sqlite3.connect(corpus) as conn:
        conn.execute("UPDATE chunks SET text='camera reads new gauges' WHERE title='Camera'")
    assert knowledge.semantic_search('readout') == []
    assert knowledge.retrieval_status()['vectors'] == 'stale-index'
    store.build_vectors(corpus, Encoder())
    assert knowledge.semantic_search('readout')[0][0]['title'] == 'Camera'


def test_failed_full_rebuild_keeps_previous_database(corpus):
    original = corpus.read_bytes()
    class Incomplete(Encoder):
        def passages(self, texts): return []
    with pytest.raises(ValueError):
        store.build(db=corpus, embedder=Incomplete())
    assert corpus.read_bytes() == original
    assert not list(corpus.parent.glob('index-*.sqlite'))


def test_failed_vector_upgrade_keeps_previous_vectors(corpus):
    original = corpus.read_bytes()
    class Invalid(Encoder):
        def passages(self, texts): return [[float('nan'), 0] for _ in texts]
    with pytest.raises(ValueError):
        store.build_vectors(corpus, Invalid())
    assert corpus.read_bytes() == original


def test_windows_retain_late_content_with_overlap():
    text = 'a' * 3000 + 'late evidence'
    parts = list(windows('Title', text))
    assert all(len(part) <= 806 for part in parts)
    assert parts[-1].endswith('late evidence')
    assert parts[0][-120:] == parts[1][6:126]


def test_legacy_index_can_be_upgraded_without_losing_records(corpus):
    with sqlite3.connect(corpus) as conn:
        before = conn.execute('SELECT * FROM chunks').fetchall()
        conn.executescript('DROP TABLE vectors; DROP TABLE vector_meta;')
    knowledge = store.Knowledge(corpus, embedder=Encoder())
    assert knowledge.search('camera')
    assert knowledge.retrieval_status()['vectors'] == 'missing-index'
    store.build_vectors(corpus, Encoder())
    assert knowledge.semantic_search('readout')
    with sqlite3.connect(corpus) as conn:
        assert conn.execute('SELECT * FROM chunks').fetchall() == before


def test_query_and_passage_prefixes_are_distinct(monkeypatch):
    from backend.app.knowledge.embeddings import LocalEmbedder
    seen=[]
    class Model:
        def embed(self, texts, **kwargs):
            seen.extend(texts)
            return iter([[1,0] for _ in texts])
    encoder=LocalEmbedder()
    monkeypatch.setattr(encoder,'_load',lambda **kwargs:Model())
    encoder.passages(['仪表读数']);encoder.query('read a gauge')
    assert seen==['passage: 仪表读数','query: read a gauge']


def test_corrupted_vectors_are_not_used(corpus):
    with sqlite3.connect(corpus) as conn:
        conn.execute("UPDATE vectors SET vector=?",(b'\x00'*8,))
    knowledge=store.Knowledge(corpus,embedder=Encoder())
    assert knowledge.search('camera')[0]['title']=='Camera'
    assert knowledge.retrieval_status()['vectors']=='invalid-index'
