from __future__ import annotations

import pytorch_lightning as pl
import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from torchmetrics.text import ROUGEScore, BLEUScore

from question_generator.bert_score import BERTScoreMetric


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

        self.val_rouge = ROUGEScore(use_stemmer=True)
        self.val_bleu = BLEUScore()
        self.val_bertscore = BERTScoreMetric(lang="en", model_type="roberta-base")

    def forward(self, batch):
        return self.model(**batch)

    def _step(self, batch, stage: str):
        outputs = self(batch)
        loss = outputs.loss
        self.log(f"{stage}_loss", loss, on_step=False, on_epoch=True, prog_bar=True)
        return loss

    def training_step(self, batch, _):
        return self._step(batch, "train")

    def validation_step(self, batch, _):
        loss = self._step(batch, "val")

        generated_ids = self.model.generate(
            batch["input_ids"],
            attention_mask=batch["attention_mask"],
            max_length=self.hparams.max_out,
            num_beams=4,
            early_stopping=True
        )

        preds = self.tokenizer.batch_decode(generated_ids, skip_special_tokens=True)

        labels = batch["labels"].clone()
        labels[labels == -100] = self.tokenizer.pad_token_id
        refs_text = self.tokenizer.batch_decode(labels, skip_special_tokens=True)

        refs = [[r] for r in refs_text]

        self.val_rouge.update(preds, refs_text)
        self.val_bleu.update(preds, refs)
        self.val_bertscore.update(preds, refs_text)

        return loss

    def on_validation_epoch_end(self):
        rouge = self.val_rouge.compute()
        bleu = self.val_bleu.compute()
        bert = self.val_bertscore.compute()

        self.log_dict(
            {
                "rouge1": rouge["rouge1_fmeasure"],
                "rouge2": rouge["rouge2_fmeasure"],
                "rougeL": rouge["rougeL_fmeasure"],
                "bleu": bleu,
                "bertscore": bert,
            },
            prog_bar=True,
        )

        self.val_rouge.reset()
        self.val_bleu.reset()
        self.val_bertscore.reset()

    def configure_optimizers(self):
        return torch.optim.AdamW(self.parameters(), lr=self.hparams.lr)
