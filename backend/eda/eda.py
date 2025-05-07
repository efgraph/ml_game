import json
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

from hydra import initialize, compose
from omegaconf import DictConfig

def load_config() -> DictConfig:
    with initialize(version_base=None, config_path="../conf"):
        cfg = compose(config_name="config")
    return cfg

cfg = load_config()

sns.set(style="whitegrid")

PLOT_DIR = Path(__file__).parent / "eda_outputs"
PLOT_DIR.mkdir(exist_ok=True)

classifier_path = Path(cfg.base.classifier_file)
classifier_rows = [json.loads(line) for line in classifier_path.open(encoding="utf-8")]
df_classifier = pd.DataFrame(classifier_rows)

qgen_path = Path(cfg.base.qa_file)
qgen_rows = [json.loads(line) for line in qgen_path.open(encoding="utf-8")]
df_qgen = pd.DataFrame(qgen_rows)

df_qgen["question"] = df_qgen["output"].apply(lambda x: x["question"])
df_qgen["answers"] = df_qgen["output"].apply(lambda x: x["answers"])
df_qgen["type"] = df_qgen["output"].apply(lambda x: x["type"])

df_qgen["topic"] = df_qgen["input"].apply(lambda s: s.split(":")[-1].strip())
df_classifier["answer_len"] = df_classifier["student_answer"].str.split().str.len()

plt.figure(figsize=(6, 4))
sns.countplot(x="score", data=df_classifier)
plt.title("Распределение оценок")
plt.xlabel("Оценка")
plt.ylabel("Количество")
plt.tight_layout()
plt.savefig(PLOT_DIR / "score_distribution.png", bbox_inches="tight")
plt.show()


plt.figure(figsize=(6, 4))
sns.boxplot(x="score", y="answer_len", data=df_classifier)
plt.title("Зависимость длины ответа от оценки")
plt.xlabel("Оценка")
plt.ylabel("Длина ответа")
plt.tight_layout()
plt.savefig(PLOT_DIR / "answer_length_vs_score.png", bbox_inches="tight")
plt.show()

df_qgen["avg_answer_len"] = df_qgen["answers"].apply(lambda ans: sum(len(a.split()) for a in ans) / len(ans) if ans else 0)

plt.figure(figsize=(6, 4))
sns.histplot(df_qgen["avg_answer_len"], bins=20, kde=True)
plt.title("Средняя длина ответа")
plt.xlabel("Количество токенов")
plt.ylabel("Частота")
plt.tight_layout()
plt.savefig(PLOT_DIR / "avg_answer_length_generation.png", bbox_inches="tight")
plt.show()


num_duplicates = df_qgen["question"].duplicated().sum()

num_duplicates, df_classifier.shape, df_qgen.shape
