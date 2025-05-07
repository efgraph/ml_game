from __future__ import annotations

import os

from dataparser.question_context import run_generate_concept_context

os.environ["TOKENIZERS_PARALLELISM"] = "false"

import json
from typing import List, Optional, Union

import fire
from hydra import compose, initialize
import mlflow

from dataparser.generate_synthetic_data import run_generate_synthetic
from dataparser.build_graded_dataset import run_build_graded

from question_generator.train import train_qgen
from question_generator.infer import infer_qgen

from answer_classifier.train import train_classifier
from answer_classifier.infer import infer_classifier


def _parse_refs(arg: Union[str, List[str]]) -> List[str]:
    if isinstance(arg, list):
        return [str(x).strip() for x in arg if str(x).strip()]

    arg = arg.strip()
    if arg.startswith("["):
        return json.loads(arg)
    return [s.strip() for s in arg.split("||") if s.strip()]


class CLI:
    def __init__(self, config_name: str = "config", config_path: str = "conf"):
        with initialize(version_base=None, config_path=config_path):
            self.cfg = compose(config_name=config_name)
            if hasattr(self.cfg, 'base') and hasattr(self.cfg.base, 'tracking_uri'):
                 mlflow.set_tracking_uri(self.cfg.base.tracking_uri)
            else:
                print("MLflow using default config.")

    def parse(self, questions: bool = False, context: bool = False):
        if questions:
            run_generate_synthetic(self.cfg)
        elif context:
            run_generate_concept_context(self.cfg)
        else:
            run_build_graded(self.cfg)

    def train(self, questions: bool = False, grader: bool = False, resume: bool = False):
        if questions:
            return train_qgen(self.cfg, resume=resume)
        return train_classifier(self.cfg, resume=resume)

    def infer(
        self,
        questions: bool = False,
        grader: bool = False,
        prompt: Optional[str] = None,
        question: Optional[str] = None,
        student_answer: Optional[str] = None,
        ref_answers: Optional[str] = None,
        checkpoint: Optional[str] = None,
    ):
        if questions:
            if prompt is None:
                raise ValueError("--prompt required with --questions")
            return infer_qgen(prompt, self.cfg)

        if None in (question, student_answer):
            raise ValueError("--question, --student_answer required")
        if ref_answers:
            refs = _parse_refs(ref_answers)
            return infer_classifier(question, student_answer, refs, checkpoint)
        return infer_classifier(question, student_answer, checkpoint)


if __name__ == "__main__":
    fire.Fire(CLI)
