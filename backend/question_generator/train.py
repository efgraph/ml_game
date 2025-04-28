from __future__ import annotations
from typing import Any, Dict

import pytorch_lightning as pl
from omegaconf import DictConfig

from question_generator.logger_selector import get_logger
from question_generator.model import QuestionGenerator
from question_generator.datamodule import QuestionDataModule
from question_generator.plotter import MetricPlotterCallback


def train_qgen(cfg: DictConfig) -> Dict[str, Any]:
    qa = cfg.qa

    dm = QuestionDataModule(
        file_path=cfg.base.qa_file,
        model_name=qa.model_name,
        batch_size=qa.batch_size,
        max_in=qa.max_in,
        max_out=qa.max_out,
        num_workers=qa.num_workers,
        val_split=qa.val_split,
        seed=qa.seed,
    )

    model = QuestionGenerator(
        model_name=qa.model_name,
        lr=qa.lr,
        max_in=qa.max_in,
        max_out=qa.max_out,
    )

    logger = get_logger(qa)

    ckpt_cb = pl.callbacks.ModelCheckpoint(
        monitor="val_loss",
        dirpath=qa.model_dir,
        filename="qgen-{val_loss:.3f}",
        save_top_k=1,
        mode="min",
    )

    trainer = pl.Trainer(
        accelerator=qa.accelerator,
        devices=qa.devices,
        max_epochs=qa.epochs,
        precision=qa.precision,
        gradient_clip_val=qa.grad_clip,
        accumulate_grad_batches=qa.accum_grad,
        logger=logger,
        callbacks=[ckpt_cb, MetricPlotterCallback()],
    )

    trainer.fit(model, dm)
    trainer.validate(model, datamodule=dm)

    return {"best_model_path": ckpt_cb.best_model_path}
