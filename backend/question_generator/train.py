from __future__ import annotations
from typing import Any, Dict

import pytorch_lightning as pl
from omegaconf import DictConfig
import mlflow

from common.logger_selector import get_logger
from question_generator.model import QuestionGenerator
from question_generator.datamodule import QuestionDataModule
from common.plotter import MetricPlotterCallback
from common.checkpoint_utils import find_latest_checkpoint_by_epoch

def train_qgen(cfg: DictConfig, resume: bool = False) -> Dict[str, Any]:
    qa = cfg.qa

    mlflow.set_experiment(qa.experiment_name)

    dm = QuestionDataModule(
        file_path=cfg.base.qa_file,
        context_file_path=cfg.base.ctx_file,
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

    filename_pattern = "qgen-{epoch:02d}-{bertscore:.4f}.ckpt"
    ckpt_cb = pl.callbacks.ModelCheckpoint(
        monitor="bertscore",
        dirpath=qa.model_dir,
        filename=filename_pattern.replace(".ckpt", ""),
        save_top_k=1,
        mode="max",
        save_last=False
    )

    resume_ckpt_path = None
    if resume:
        resume_ckpt_path = find_latest_checkpoint_by_epoch(qa.model_dir, "qgen")

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

    trainer.fit(model, dm, ckpt_path=resume_ckpt_path)
    trainer.validate(model, datamodule=dm)

    return {"best_model_path": ckpt_cb.best_model_path}
