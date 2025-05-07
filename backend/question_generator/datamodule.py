from __future__ import annotations

import json, random, re, os
from pathlib import Path
from typing import Dict, List, Optional

import pytorch_lightning as pl
import torch
from torch.utils.data import DataLoader
from transformers import AutoTokenizer

from common.context_provider import load_qa_contexts

os.environ["TOKENIZERS_PARALLELISM"] = "false"


def _extract_q(output: Dict) -> str:
    return output["question"]


class QuestionDataModule(pl.LightningDataModule):
    def __init__(
        self,
        file_path: str,
        model_name: str,
        context_file_path: str,
        use_context: bool = False,
        batch_size: int = 8,
        max_in: int = 64,
        max_out: int = 64,
        num_workers: int = 4,
        val_split: float = 0.1,
        seed: int = 42,
    ):
        super().__init__()
        self.file_path = Path(file_path)
        self.use_context = use_context
        self.context_file_path = Path(context_file_path)
        self.batch_size = batch_size
        self.max_in, self.max_out = max_in, max_out
        self.num_workers = num_workers
        self.val_split = val_split
        self.seed = seed
        self.tokenizer = AutoTokenizer.from_pretrained(model_name, legacy=True)
        self.train_rows: List[Dict] = []
        self.val_rows: List[Dict] = []
        self.contexts: Dict[str, str] = {}

    def setup(self, stage: Optional[str] = None):
        rows = [json.loads(l) for l in self.file_path.open()]

        if self.use_context:
            self.contexts = load_qa_contexts(self.context_file_path)

        processed_rows = []
        for row in rows:
            if self.use_context and self.contexts and 'input' in row:
                match = re.search(r'^(.*?):(.*)$', row['input'])
                topic = None
                original_input = row['input']

                if match:
                    topic = match.group(2).strip()

                context = self.contexts.get(topic)
                row['input'] = f"{original_input} [SEP] {context}" if self.use_context else original_input,

            processed_rows.append(row)

        random.Random(self.seed).shuffle(processed_rows)
        cut = int(len(processed_rows) * (1 - self.val_split))
        self.train_rows, self.val_rows = processed_rows[:cut], processed_rows[cut:]

    def _encode(self, row: Dict) -> Dict[str, torch.Tensor]:
        input_text = row.get("input", "")

        enc = self.tokenizer(
            input_text,
            max_length=self.max_in,
            truncation=True,
            padding="max_length",
        )
        enc["labels"] = self.tokenizer(
            _extract_q(row["output"]),
            max_length=self.max_out,
            truncation=True,
            padding="max_length",
        )["input_ids"]
        return {k: torch.tensor(v) for k, v in enc.items()}

    def _loader(self, rows):
        dataloader_kwargs = {
            "batch_size": self.batch_size,
            "shuffle": True,
            "num_workers": self.num_workers,
        }
        
        if self.num_workers > 0:
            dataloader_kwargs["persistent_workers"] = True
        
        return DataLoader(
            [self._encode(r) for r in rows],
            **dataloader_kwargs
        )

    def train_dataloader(self):
        return self._loader(self.train_rows)

    def val_dataloader(self):
        return self._loader(self.val_rows)
