from __future__ import annotations

import json
from pathlib import Path
from typing import Dict

def load_qa_contexts(file_path: str | Path) -> Dict[str, str]:
    context_file_path = Path(file_path)
    loaded_contexts: Dict[str, str] = {}

    try:
        loaded_contexts = {}
        with context_file_path.open('r', encoding='utf-8') as f:
            for line in f:
                try:
                    context_entry = json.loads(line)
                    loaded_contexts[context_entry["topic"]] = context_entry["context"]
                except json.JSONDecodeError:
                    continue
    except Exception as e:
        print(f"Error reading context file {context_file_path}: {e}.")

    return loaded_contexts 