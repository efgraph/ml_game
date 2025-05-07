import os
import glob
import re
from typing import Optional


def find_latest_checkpoint_by_epoch(checkpoint_dir: str, filename_prefix: str) -> Optional[str]:
    resume_ckpt_path = None
    highest_epoch = -1

    epoch_regex = re.compile(rf"{re.escape(filename_prefix)}-epoch=(\d+).*\.ckpt$")

    if not os.path.isdir(checkpoint_dir):
        print(f"Checkpoint not found: {checkpoint_dir}.")
        return None

    checkpoints = glob.glob(os.path.join(checkpoint_dir, f'{filename_prefix}*.ckpt'))

    for f_path in checkpoints:
        basename = os.path.basename(f_path)
        match = epoch_regex.search(basename)
        if match:
            try:
                epoch = int(match.group(1))
                if epoch > highest_epoch:
                    highest_epoch = epoch
                    resume_ckpt_path = os.path.abspath(f_path)
            except ValueError:
                continue

    return resume_ckpt_path
