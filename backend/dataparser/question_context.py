import json, time, logging
from pathlib import Path

import hydra
from openai import OpenAI
from omegaconf import DictConfig
from tqdm import tqdm

from dataparser.dataset import generate_context_for_topic

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(message)s")

def run_generate_concept_context(cfg: DictConfig) -> None:
    g = cfg.dataparser
    client = OpenAI(api_key=cfg.base.openai_api_key)

    path = Path(g.context_file)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.touch(exist_ok=True)

    with path.open("a", encoding="utf-8") as fp:
        for topic in tqdm(g.subtopics, desc="Generating context"):
            try:
                log.info("▶ Prompting for context: %s", topic)
                context = generate_context_for_topic(topic, client, g, log_prompts=True)
                rec = {
                    "topic": topic,
                    "context": context,
                }
                json.dump(rec, fp, ensure_ascii=False)
                fp.write("\n")
            except (AttributeError, TypeError) as e:
                log.warning(f"Skipping topic: {topic} - Error: {e}")
                continue

            time.sleep(g.rate_delay_seconds)


@hydra.main(config_path="../conf", config_name="config", version_base=None)
def main(cfg: DictConfig) -> None:
    run_generate_concept_context(cfg)


if __name__ == "__main__":
    main()
