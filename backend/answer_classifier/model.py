from __future__ import annotations

import pytorch_lightning as pl
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torchmetrics


class AnswerGrader(pl.LightningModule):
    def __init__(
        self,
        model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
        num_classes: int = 4,
        lr: float = 2e-5,
        max_len: int = 128,
    ):
        super().__init__()
        self.save_hyperparameters()

        self.model = AutoModelForSequenceClassification.from_pretrained(
            model_name,
            num_labels=num_classes,
            ignore_mismatched_sizes=True,
        )
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)

        self.loss_fn = torch.nn.CrossEntropyLoss()
        self.metric_acc = torchmetrics.Accuracy(task="multiclass", num_classes=num_classes)
        self.metric_f1 = torchmetrics.F1Score(
            task="multiclass", num_classes=num_classes, average="macro"
        )

    def forward(self, batch):
        return self.model(**batch).logits

    def _shared_step(self, batch, stage: str):
        logits = self(batch)
        loss = self.loss_fn(logits, batch["labels"])

        self.metric_acc(logits, batch["labels"])
        self.metric_f1(logits, batch["labels"])

        self.log(f"{stage}_loss", loss, prog_bar=True)
        self.log(f"{stage}_acc", self.metric_acc, prog_bar=True)
        self.log(f"{stage}_f1", self.metric_f1, prog_bar=True)
        return loss

    def training_step(self, batch, _):
        return self._shared_step(batch, "train")

    def validation_step(self, batch, _):
        self._shared_step(batch, "val")

    def configure_optimizers(self):
        return torch.optim.AdamW(self.parameters(), lr=self.hparams.lr)
