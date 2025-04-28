import json, random, time, logging
from pathlib import Path

import hydra
from openai import OpenAI, RateLimitError, APIError
from omegaconf import DictConfig
from tqdm import tqdm

from dataparser.dataset import generate_graded_answers

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)


def run_build_graded(cfg: DictConfig) -> None:
    g = cfg.dataparser
    client = OpenAI(api_key=cfg.base.openai_api_key)

    in_path = Path(cfg.base.qa_file)
    out_path = Path(cfg.base.classifier_file)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.touch(exist_ok=True)

    if not in_path.exists():
        return

    rows = [json.loads(line) for line in in_path.open(encoding="utf-8")]

    qid = sum(1 for _ in out_path.open())

    with out_path.open("a", encoding="utf-8") as fp:
        for row in tqdm(rows, desc="questions"):
            try:
                output = row["output"]
                question = output["question"]
                ref_answers = output["answers"]
            except ValueError:
                continue

            log.info("▶ grading question: %s", question)
            try:
                graded = generate_graded_answers(
                    question, ref_answers, client, g, log_prompts=True
                )
            except (RateLimitError, APIError):
                time.sleep(g.rate_delay_seconds)
                continue
            log.info("  ↳ got %d graded answers", len(graded))

            for ans, score in graded:
                qid += 1
                json.dump(
                    {
                        "qid": f"Q{qid:05d}",
                        "question": question,
                        "ref_answers": ref_answers,
                        "student_answer": ans,
                        "score": score,
                    },
                    fp,
                    ensure_ascii=False,
                )
                fp.write("\n")

            time.sleep(g.rate_delay_seconds)


@hydra.main(config_path="../conf", config_name="config", version_base=None)
def main(cfg: DictConfig) -> None:
    run_build_graded(cfg)


if __name__ == "__main__":
    main()
