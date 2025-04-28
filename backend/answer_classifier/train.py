from __future__ import annotations
from typing import Any, Dict

import pytorch_lightning as pl
from omegaconf import DictConfig

from answer_classifier.datamodule import GradedAnswerDM
from answer_classifier.model import AnswerGrader
from answer_classifier.logger_selector import get_logger
from answer_classifier.plotter import MetricPlotterCallback


def train_classifier(cfg: DictConfig) -> Dict[str, Any]:
    cl = cfg.classifier

    dm = GradedAnswerDM(
        file_path=cl.data_file,
        model_name=cl.model_name,
        batch_size=cl.batch_size,
        max_len=cl.max_len,
        num_workers=cl.num_workers,
        val_split=cl.val_split,
        seed=cl.seed,
    )

    model = AnswerGrader(
        model_name=cl.model_name,
        num_classes=cl.num_classes,
        lr=cl.lr,
        max_len=cl.max_len,
    )

    logger = get_logger(cl)
    ckpt_cb = pl.callbacks.ModelCheckpoint(
        monitor="val_loss",
        dirpath=cl.model_dir,
        filename="grader-{val_loss:.3f}",
        save_top_k=1,
        mode="min",
    )

    trainer = pl.Trainer(
        accelerator=cl.accelerator,
        devices=cl.devices,
        max_epochs=cl.epochs,
        precision=cl.precision,
        gradient_clip_val=cl.grad_clip,
        accumulate_grad_batches=cl.accum_grad,
        logger=logger,
        callbacks=[ckpt_cb, MetricPlotterCallback()],
    )

    trainer.fit(model, dm)
    trainer.validate(model, datamodule=dm)

    return {"best_model_path": ckpt_cb.best_model_path}
