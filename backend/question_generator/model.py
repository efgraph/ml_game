from __future__ import annotations

import pytorch_lightning as pl
import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer


class QuestionGenerator(pl.LightningModule):
    def __init__(
        self,
        model_name: str = "google/t5-base",
        lr: float = 5e-5,
        max_in: int = 64,
        max_out: int = 64,
    ):
        super().__init__()
        self.save_hyperparameters()

        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        self.tokenizer = AutoTokenizer.from_pretrained(model_name, legacy=True)
        self.loss_fn = torch.nn.CrossEntropyLoss(ignore_index=-100)

    def forward(self, batch):
        return self.model(**batch)

    def _step(self, batch, stage: str):
        loss = self(batch).loss
        self.log(f"{stage}_loss", loss, prog_bar=True)
        return loss

    def training_step(self, batch, _):
        return self._step(batch, "train")

    def validation_step(self, batch, _):
        self._step(batch, "val")

    def configure_optimizers(self):
        return torch.optim.AdamW(self.parameters(), lr=self.hparams.lr)
