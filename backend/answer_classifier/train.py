from __future__ import annotations
from typing import Any, Dict

import pytorch_lightning as pl
from omegaconf import DictConfig
import mlflow

from answer_classifier.datamodule import GradedAnswerDM
from answer_classifier.model import AnswerGrader
from common.logger_selector import get_logger
from common.plotter import MetricPlotterCallback
from common.checkpoint_utils import find_latest_checkpoint_by_epoch

def train_classifier(cfg: DictConfig, resume: bool = False) -> Dict[str, Any]:
    cl = cfg.classifier

    mlflow.set_experiment(cl.experiment_name)

    dm = GradedAnswerDM(
        file_path=cl.data_file,
        use_ref_answers=cl.use_ref_answers,
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
    
    filename_pattern = "grader-{epoch:02d}-{val_loss:.3f}.ckpt"
    ckpt_cb = pl.callbacks.ModelCheckpoint(
        monitor="val_loss",
        dirpath=cl.model_dir,
        filename=filename_pattern.replace(".ckpt", ""),
        save_top_k=1,
        mode="min",
        save_last=False
    )

    resume_ckpt_path = None
    if resume:
        resume_ckpt_path = find_latest_checkpoint_by_epoch(cl.model_dir, "grader")

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

    trainer.fit(model, dm, ckpt_path=resume_ckpt_path)
    trainer.validate(model, datamodule=dm)

    return {"best_model_path": ckpt_cb.best_model_path}
