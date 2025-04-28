from __future__ import annotations

from pathlib import Path
from typing import Dict, Optional

import torch
from transformers import T5ForConditionalGeneration, T5Tokenizer

from question_generator.model import QuestionGenerator


def _latest_artifact(root: str | Path) -> Path:
    root = Path(root)
    cands = list(root.rglob("qgen*")) + list(root.rglob("checkpoint-*"))
    if not cands:
        raise FileNotFoundError(f"No qgen checkpoints under {root}")
    return max(cands, key=lambda p: p.stat().st_mtime)


def _load_model(path: str | Path) -> T5ForConditionalGeneration:
    path = Path(path)
    if path.is_dir():
        return T5ForConditionalGeneration.from_pretrained(path)
    if path.suffix == ".ckpt":
        lm: QuestionGenerator = QuestionGenerator.load_from_checkpoint(path, strict=False)
        return lm.model
    raise ValueError(f"Unsupported checkpoint path: {path}")


def infer_qgen(
    prompt: str,
    checkpoint: Optional[str] = None,
    model_root: str = "./models",
) -> Dict[str, str]:
    ckpt = Path(checkpoint) if checkpoint else _latest_artifact(model_root)
    model = _load_model(ckpt)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device).eval()

    tok_name = (
        getattr(model, "hparams", None) and getattr(model.hparams, "model_name", None)
    ) or model.config._name_or_path
    tok = T5Tokenizer.from_pretrained(tok_name, legacy=True)

    ids = tok(prompt, return_tensors="pt").input_ids.to(device)
    with torch.no_grad():
        out = model.generate(
            ids,
            max_new_tokens=16,
            do_sample=True,
            temperature=0.4,
            top_p=0.9,
        )

    return {
        "prompt": prompt,
        "generated_question": tok.decode(out[0], skip_special_tokens=True),
        "checkpoint": str(ckpt),
    }
