from __future__ import annotations

import json
import random
import os
from pathlib import Path
from typing import List, Dict, Optional

import pytorch_lightning as pl
import torch
from torch.utils.data import DataLoader
from transformers import AutoTokenizer

os.environ["TOKENIZERS_PARALLELISM"] = "false"


class GradedAnswerDM(pl.LightningDataModule):
    def __init__(
        self,
        file_path: str,
        model_name: str,
        use_ref_answers: bool,
        batch_size: int = 16,
        max_len: int = 128,
        val_split: float = 0.1,
        num_workers: int = 4,
        seed: int = 42,
    ):
        super().__init__()
        self.file_path = Path(file_path)
        self.use_ref_answers = use_ref_answers
        self.batch_size = batch_size
        self.max_len = max_len
        self.val_split = val_split
        self.num_workers = num_workers
        self.seed = seed

        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.train_rows: List[Dict] = []
        self.val_rows: List[Dict] = []

    def setup(self, stage: Optional[str] = None) -> None:
        with self.file_path.open() as f:
            rows = [json.loads(line) for line in f]

        exploded = [
            {
                "context": f"{row['question']} [SEP] {ref}" if self.use_ref_answers else row['question'],
                "student": row["student_answer"],
                "label": row["score"],
            }
            for row in rows
            for ref in row["ref_answers"]
        ]

        random.Random(self.seed).shuffle(exploded)
        split = int(len(exploded) * (1 - self.val_split))
        self.train_rows, self.val_rows = exploded[:split], exploded[split:]

    def _encode(self, item: Dict[str, str]) -> Dict[str, torch.Tensor]:
        tokens = self.tokenizer(
            item["context"],
            item["student"],
            truncation=True,
            padding="max_length",
            max_length=self.max_len,
            return_tensors="pt",
        )
        tokens["labels"] = torch.tensor(item["label"])
        return {k: v.squeeze(0) for k, v in tokens.items()}

    def _loader(self, rows: List[Dict[str, str]]) -> DataLoader:
        data = [self._encode(r) for r in rows]
        
        dataloader_kwargs = {
            "batch_size": self.batch_size,
            "shuffle": True,
            "num_workers": self.num_workers,
        }
        
        if self.num_workers > 0:
            dataloader_kwargs["persistent_workers"] = True
            
        return DataLoader(
            data,
            **dataloader_kwargs
        )

    def train_dataloader(self) -> DataLoader:
        return self._loader(self.train_rows)

    def val_dataloader(self) -> DataLoader:
        return self._loader(self.val_rows)
