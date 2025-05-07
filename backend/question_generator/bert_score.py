from torchmetrics import Metric
import torch
from bert_score import score as bert_score


class BERTScoreMetric(Metric):
    def __init__(self, lang: str = "en", model_type: str = None, dist_sync_on_step=False):
        super().__init__(dist_sync_on_step=dist_sync_on_step)

        self.lang = lang
        self.model_type = model_type

        self.add_state("f1_scores", default=[], dist_reduce_fx="cat")

    def update(self, preds: list[str], targets: list[str]):
        P, R, F1 = bert_score(preds, targets, lang=self.lang, model_type=self.model_type, verbose=False)
        f1_tensor = F1.to(torch.float32).to(self.device)
        self.f1_scores.append(f1_tensor)

    def compute(self):
        if not self.f1_scores:
            return torch.tensor(0.0)
        all_scores = torch.cat(self.f1_scores)
        return all_scores.mean()
