"""Trusted presentation destinations; the browser owns routes and animation."""
import json
from ..core.config import ROOT
from ..knowledge.project_catalog import CATALOG

GROUPS = json.loads((ROOT / 'content/presentation-groups.json').read_text(encoding='utf-8')) + [
    {'parentId': 'projects:collection', 'destination': 'folder:projects',
     'targets': [f'project-card:{entry["id"]}' for entry in CATALOG]},
]
PARENTS = {target: group['parentId'] for group in GROUPS for target in group['targets']}


def validate_targets(task, context):
    """Accept catalog destinations before mounting, or eligible current targets."""
    current = {target['id']: target for target in context['targets']}
    parents = []
    for item in task.items:
        if item.target in PARENTS:
            parents.append(PARENTS[item.target])
            continue
        target = current.get(item.target)
        if not target or 'highlight' not in target['capabilities'] or not (target.get('guideable') or target.get('available')):
            raise ValueError('Unknown or unavailable presentation target')
        parents.append(target.get('parentId'))
    if len(parents) > 1 and (not parents[0] or any(parent != parents[0] for parent in parents)):
        raise ValueError('Presentation items must be siblings with the same parentId')
