from typing import Any, Dict

import pytorch_lightning as pl


def get_logger(logging_conf: Dict[str, Any]) -> pl.loggers.logger.Logger:
    label = logging_conf["logger"].lower()

    if label == "mlflow":
        return pl.loggers.MLFlowLogger(
            experiment_name=logging_conf["experiment_name"],
            run_name=logging_conf["run_name"],
            tracking_uri=logging_conf.get("tracking_uri", None),
            log_model=logging_conf.get("log_model", False),
        )

    raise ValueError(f"Unknown logger: {label}")
