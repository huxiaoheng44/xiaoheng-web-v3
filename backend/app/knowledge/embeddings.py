"""Local multilingual embeddings; no visitor text is sent to a model service."""
from functools import lru_cache
from threading import RLock
import numpy as np
from ..core import config

MODEL_REVISION = '761b726dd34fb83930e26aab4e9ac3899aa1fa78'

def unit(vector):
    value = np.asarray(vector, dtype=np.float32)
    if value.ndim != 1 or not value.size or not np.isfinite(value).all():
        raise ValueError('Invalid embedding')
    norm = np.linalg.norm(value)
    if not np.isfinite(norm) or norm <= 0:
        raise ValueError('Empty embedding')
    return value / norm


class LocalEmbedder:
    def __init__(self):
        self.model_id = config.EMBEDDING_MODEL + ':' + MODEL_REVISION + ':int8-e5-prefix-v1'
        self._model = None
        self._tokenizer = None
        self._lock = RLock()

    def _load(self, allow_download=False):
        if self._model is None:
            from fastembed import TextEmbedding
            from fastembed.common.model_description import ModelSource, PoolingType
            from huggingface_hub import snapshot_download
            name = config.EMBEDDING_MODEL
            if name != 'Xenova/multilingual-e5-small':
                raise ValueError('Unsupported embedding model; update the encoder before rebuilding')
            if not any(m['model'] == name for m in TextEmbedding.list_supported_models()):
                TextEmbedding.add_custom_model(
                    model=name, pooling=PoolingType.MEAN, normalization=True,
                    sources=ModelSource(hf=name), dim=384,
                    model_file='onnx/model_quantized.onnx', license='mit', size_in_gb=0.118,
                )
            download = dict(repo_id=name, revision=MODEL_REVISION, cache_dir=str(config.EMBEDDING_CACHE),
                            allow_patterns=['config.json', 'tokenizer.json', 'tokenizer_config.json',
                                            'special_tokens_map.json', 'onnx/model_quantized.onnx'])
            try:
                model_path = snapshot_download(**download, local_files_only=True)
            except FileNotFoundError:
                if not allow_download:
                    raise RuntimeError('Embedding cache missing; run backend:vectors before serving') from None
                model_path = snapshot_download(**download)
            self._model = TextEmbedding(
                model_name=name, cache_dir=str(config.EMBEDDING_CACHE),
                threads=config.EMBEDDING_THREADS, providers=['CPUExecutionProvider'],
                specific_model_path=model_path,
            )
        return self._model

    def passages(self, texts):
        with self._lock:
            return [unit(v) for v in self._load(allow_download=True).embed(['passage: ' + text for text in texts], batch_size=16)]

    def windows(self, title, text):
        # Clone the tokenizer so counting never changes inference truncation.
        from tokenizers import Tokenizer
        with self._lock:
            if self._tokenizer is None:
                self._tokenizer = Tokenizer.from_str(self._load(allow_download=True).model.tokenizer.to_str())
                self._tokenizer.no_truncation()
                self._tokenizer.no_padding()
            tokenizer = self._tokenizer
        heading = title[:160] + '\n'
        budget = max(32, 500 - len(tokenizer.encode('passage: ' + heading).ids))
        offsets = tokenizer.encode(text, add_special_tokens=False).offsets
        if not offsets:
            return [heading]
        parts = []
        start = 0
        while start < len(offsets):
            end = min(len(offsets), start + budget)
            passage = heading + text[offsets[start][0]:offsets[end - 1][1]]
            while len(tokenizer.encode('passage: ' + passage).ids) > 512 and end > start + 1:
                end -= 1
                passage = heading + text[offsets[start][0]:offsets[end - 1][1]]
            parts.append(passage)
            if end == len(offsets):
                break
            start = max(start + 1, end - min(64, budget // 4))
        return parts

    def query(self, text):
        with self._lock:
            return unit(next(iter(self._load().embed(['query: ' + text]))))


@lru_cache(maxsize=1)
def default_embedder():
    return LocalEmbedder()
