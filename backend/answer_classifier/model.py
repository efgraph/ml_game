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

        self.train_acc = torchmetrics.Accuracy(
            task="multiclass", num_classes=num_classes)
        self.train_f1 = torchmetrics.F1Score(
            task="multiclass", num_classes=num_classes, average="macro")

        self.val_acc = self.train_acc.clone()
        self.val_f1 = self.train_f1.clone()

    def forward(self, batch):
        return self.model(**batch).logits

    def _shared_step(self, batch, stage: str):
        logits = self(batch)
        loss = self.loss_fn(logits, batch["labels"])
        preds = logits.argmax(dim=-1)

        if stage == "train":
            acc = self.train_acc(preds, batch["labels"])
            f1 = self.train_f1(preds, batch["labels"])

            self.log(
                "train_loss", loss,
                on_step=False, on_epoch=True, sync_dist=True
            )
            self.log(
                "train_acc", acc,
                on_step=False, on_epoch=True, sync_dist=True
            )
            self.log(
                "train_f1", f1,
                on_step=False, on_epoch=True, sync_dist=True
            )
        else:
            self.val_acc.update(preds, batch["labels"])
            self.val_f1.update(preds, batch["labels"])

            self.log(
                "val_loss", loss,
                on_step=False, on_epoch=True, prog_bar=True, sync_dist=True
            )

        return loss

    def training_step(self, batch, _):
        return self._shared_step(batch, stage="train")

    def validation_step(self, batch, _):
        self._shared_step(batch, stage="val")

    def on_validation_epoch_end(self):
        val_acc = self.val_acc.compute()
        val_f1 = self.val_f1.compute()

        self.log("acc", val_acc, prog_bar=True, sync_dist=True)
        self.log("f1", val_f1, prog_bar=True, sync_dist=True)

        self.val_acc.reset()
        self.val_f1.reset()

    def configure_optimizers(self):
        return torch.optim.AdamW(self.parameters(), lr=self.hparams.lr)
