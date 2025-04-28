import json, random, time, logging
from pathlib import Path

import hydra
from openai import OpenAI
from omegaconf import DictConfig
from tqdm import tqdm

from dataparser.dataset import generate_qa_pairs_for_topic


log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(message)s")


def run_generate_synthetic(cfg: DictConfig) -> None:
    g = cfg.dataparser
    client = OpenAI(api_key=cfg.base.openai_api_key)

    path = Path(g.output_file)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.touch(exist_ok=True)

    with path.open("a", encoding="utf-8") as fp:
        for topic in tqdm(g.subtopics, desc="topics"):
            seen = set()

            log.info("▶ Prompting for topic: %s", topic)
            items = generate_qa_pairs_for_topic(topic, client, g, log_prompts=True)
            log.info("  ↳ got %d pairs", len(items))

            random.shuffle(items)
            for it in items:
                try:
                    type_value = it.get("type", "")
                    if type_value in seen:
                        continue
                    seen.add(type_value)

                    rec = {
                        "input": f"generate a {type_value} question about: {topic}",
                        "output": it,
                    }
                    json.dump(rec, fp, ensure_ascii=False)
                    fp.write("\n")
                except (AttributeError, TypeError) as e:
                    log.warning(f"Skipping malformed item: {it} - Error: {e}")
                    continue

            time.sleep(g.rate_delay_seconds)


@hydra.main(config_path="../conf", config_name="config", version_base=None)
def main(cfg: DictConfig) -> None:
    run_generate_synthetic(cfg)


if __name__ == "__main__":
    main()
