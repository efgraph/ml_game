from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional, Sequence

import numpy as np
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

from answer_classifier.model import AnswerGrader


def _latest_artifact(root: str | Path) -> Path:
    root = Path(root)
    cands = list(root.rglob("grader*")) + list(root.rglob("checkpoint-*"))
    if not cands:
        raise FileNotFoundError(f"No grader checkpoints under {root}")
    return max(cands, key=lambda p: p.stat().st_mtime)


def _load_ckpt(path: Path):
    module: AnswerGrader = AnswerGrader.load_from_checkpoint(path, map_location="cpu", strict=False)
    tok = AutoTokenizer.from_pretrained(module.hparams.model_name)
    return module.model, tok


def _load_dir(path: Path):
    tok = AutoTokenizer.from_pretrained(path)
    mdl = AutoModelForSequenceClassification.from_pretrained(path)
    return mdl, tok


def infer_classifier(
    question: str,
    student_answer: str,
    ref_answers: Sequence[str] = None,
    checkpoint: Optional[str] = None,
    model_root: str = "./models",
    reduction: str = "mean",
) -> Dict[str, Any]:
    path = Path(checkpoint) if checkpoint else _latest_artifact(model_root)
    model, tokenizer = (
        _load_dir(path) if path.is_dir()
        else _load_ckpt(path) if path.suffix == ".ckpt"
        else (_ for _ in ()).throw(ValueError(f"Unknown checkpoint type: {path}"))
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device).eval()

    ref_answers = ref_answers or [None]

    logits_stack = []
    for ref in ref_answers:
        prompt = f"{question} [SEP] {ref}" if ref else question
        toks = tokenizer(
            prompt,
            student_answer,
            truncation=True,
            padding="max_length",
            max_length=128,
            return_tensors="pt",
        ).to(device)
        with torch.no_grad():
            logits_stack.append(model(**toks).logits[0].cpu().numpy())

    logits_arr = np.stack(logits_stack)
    logits = logits_arr.mean(0) if reduction == "mean" else logits_arr.max(0)

    probs = (np.exp(logits) / np.exp(logits).sum()).round(4).tolist()
    return {
        "question": question,
        "student_answer": student_answer,
        "predicted_score": int(np.argmax(logits)),
        "probabilities": probs,
        "checkpoint_used": str(path),
    }
