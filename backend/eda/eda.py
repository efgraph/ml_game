import json
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from sklearn.metrics import confusion_matrix
from hydra import initialize, compose
from omegaconf import DictConfig

def load_config() -> DictConfig:
    with initialize(version_base=None, config_path="../conf"):
        cfg = compose(config_name="config")
    return cfg

cfg = load_config()

sns.set(style="whitegrid")

PREDICTIONS_DIR = Path(__file__).parent / "predictions"
PLOT_DIR = Path(__file__).parent / "eda_outputs"
PLOT_DIR.mkdir(exist_ok=True)

jsonl_files = sorted(PREDICTIONS_DIR.glob("*.jsonl"))

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

true_labels = []
pred_labels = []

for fpath in jsonl_files:
    with fpath.open("r", encoding="utf-8") as f:
        for line in f:
            item = json.loads(line)
            true_labels.append(item["true"])
            pred_labels.append(item["pred"])

labels = sorted(set(true_labels + pred_labels))
cm = confusion_matrix(true_labels, pred_labels, labels=labels)

plt.figure(figsize=(6, 5))
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=labels, yticklabels=labels)
plt.title("Матрица ошибок")
plt.xlabel("Предсказанная оценка")
plt.ylabel("Референсная оценка")
plt.tight_layout()
plt.savefig(PLOT_DIR / "confusion_matrix.png", bbox_inches="tight")
plt.show()
