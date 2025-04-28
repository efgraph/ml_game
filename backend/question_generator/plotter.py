import os
from collections import defaultdict
from typing import Dict, List

import matplotlib.pyplot as plt
import pytorch_lightning as pl


class MetricPlotterCallback(pl.Callback):

    def __init__(self, out_dir: str = "plots"):
        super().__init__()
        self.out_dir = out_dir
        self.history: Dict[str, List[float]] = defaultdict(list)

    def on_train_epoch_end(self, trainer: pl.Trainer, *_) -> None:
        metrics = trainer.callback_metrics
        for name, value in metrics.items():
            if not isinstance(value, (float, int)):
                try:
                    value = float(value)
                except Exception:
                    continue
            if any(name.startswith(p) for p in ("train_", "val_", "test_")):
                self.history[name].append(value)

    def on_train_end(self, trainer: pl.Trainer, *_) -> None:
        if not self.history:
            return

        os.makedirs(self.out_dir, exist_ok=True)

        mlflow_logger = (
            trainer.logger
            if isinstance(trainer.logger, pl.loggers.MLFlowLogger)
            else None
        )
        mlflow_run_id = getattr(mlflow_logger, "run_id", None)

        for name, values in self.history.items():
            plt.figure()
            plt.plot(range(1, len(values) + 1), values, marker="o")
            plt.xlabel("epoch")
            plt.ylabel(name)
            plt.title(name)
            plt.tight_layout()

            path = os.path.join(self.out_dir, f"{name}.png")
            plt.savefig(path)
            plt.close()

            if mlflow_logger:
                mlflow_logger.experiment.log_artifact(mlflow_run_id, path)
