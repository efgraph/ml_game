from __future__ import annotations

import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import json
from typing import List, Optional, Union

import fire
from hydra import compose, initialize

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

    def parse(self, questions: bool = False):
        if questions:
            run_generate_synthetic(self.cfg)
        else:
            run_build_graded(self.cfg)

    def train(self, questions: bool = False, grader: bool = False):
        if questions:
            return train_qgen(self.cfg)
        return train_classifier(self.cfg)

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
            return infer_qgen(prompt, checkpoint)

        if None in (question, student_answer, ref_answers):
            raise ValueError("--question, --student_answer and --ref_answers required")

        refs = _parse_refs(ref_answers)
        return infer_classifier(question, student_answer, refs, checkpoint)


if __name__ == "__main__":
    fire.Fire(CLI)
