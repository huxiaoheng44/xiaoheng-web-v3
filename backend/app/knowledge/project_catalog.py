"""Curated topic vocabulary shared by discovery and evidence retrieval."""
import json
from ..core.config import ROOT

CATALOG = json.loads((ROOT / 'content/guide-catalog.json').read_text(encoding='utf-8'))
TOPICS = {
    'full-stack': r'full[ -]?stack|全栈',
    'llm': r'(?<![a-z])llms?(?![a-z])|large language models?|大(?:语言)?模型|语言模型|gemini|多模态|multimodal',
    'ocr': r'\bocr\b|文字识别',
    'rag': r'(?<![a-z])rag(?![a-z])|检索',
    'ai': r'(?<![a-z])ai(?![a-z])|人工智能|智能',
    'web': r'\bweb\b|网页|网站',
    'vision': r'\bvision\b|视觉',
    'robotics': r'\brobotics?\b|机器人',
    'systems': r'\bsystems?\b|系统',
    'machine-learning': r'machine learning|机器学习',
    '3d': r'\b3d\b',
}
