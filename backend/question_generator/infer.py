from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, Optional

import torch
from omegaconf import DictConfig
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

from question_generator.model import QuestionGenerator
from common.context_provider import load_qa_contexts


def _latest_artifact(root: str | Path) -> Path:
    root = Path(root)
    cands = list(root.rglob("qgen*")) + list(root.rglob("checkpoint-*"))
    if not cands:
        raise FileNotFoundError(f"No qgen checkpoints under {root}")
    return max(cands, key=lambda p: p.stat().st_mtime)


def _load_model(path: str | Path) -> AutoModelForSeq2SeqLM:
    path = Path(path)
    if path.suffix == ".ckpt":
        lm: QuestionGenerator = QuestionGenerator.load_from_checkpoint(path, strict=False)
        return lm.model
    raise ValueError(f"Unsupported checkpoint path: {path}")


def infer_qgen(
    prompt: str,
    cfg: DictConfig = None,
    checkpoint: Optional[str] = None,
    model_root: str = "./models",
    use_context: bool = True,
) -> Dict[str, str]:
    ckpt = Path(checkpoint) if checkpoint else _latest_artifact(model_root)
    model = _load_model(ckpt)

    contexts: Dict[str, str] = {}
    if use_context and cfg:
        contexts = load_qa_contexts(cfg.base.ctx_file)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device).eval()

    tok_name = (
        getattr(model, "hparams", None) and getattr(model.hparams, "model_name", None)
    ) or model.config._name_or_path
    tok = AutoTokenizer.from_pretrained(tok_name, legacy=True if "t5" in tok_name.lower() else False)

    input_text = prompt
    topic = None
    context = None

    if use_context and contexts:
        match = re.search(r":\s*(.*)$", prompt)
        if match:
            topic = match.group(1).strip()
            context = contexts.get(topic)
            if context:
                input_text = f"{prompt} [SEP] {context}"

    ids = tok(input_text, return_tensors="pt").input_ids.to(device)
    with torch.no_grad():
        out = model.generate(
            ids,
            max_new_tokens=16,
            do_sample=True,
            temperature=0.5,
            top_p=0.9,
        )

    return {
        "prompt": prompt,
        "topic": topic,
        "context": context,
        "generated_question": tok.decode(out[0], skip_special_tokens=True),
        "checkpoint": str(ckpt),
    }
