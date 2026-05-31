"""
Corridoor v2 — Floorplan Processor (page-per-image approach)

Strategy: rasterize each PDF page as one image, detect which floor plans
are shown on that page, name the image accordingly.
No cropping — the frontend handles pan/zoom on the full page image.
"""

import json
import os
import re
from pathlib import Path
from typing import Optional
from PIL import Image
import pdfplumber
from dotenv import load_dotenv

load_dotenv()

NOC_DATA_DIR = Path("noc_data")

FLOOR_PATTERNS = [
    (r'^BASEMENTFLOORPLAN$',                   "Basement",   [-1]),
    (r'BASEMENTFLOORPLAN',                     "Basement",   [-1]),
    (r'^GROUNDFLOORPLAN$',                     "Ground",     [0]),
    (r'GROUNDFLOORPLAN',                       "Ground",     [0]),
    (r'TERRACEFLOORPLAN',                      "Terrace",    [999]),
    (r'TERRACEOPEN',                           "Terrace",    [999]),
    (r'(?<!\d)(\d+)(?:ST|ND|RD|TH)PODIUMFLOORPLAN', None,   None),
    (r'(?<!\d)(\d+)(?:ST|ND|RD|TH)TO(\d+)(?:ST|ND|RD|TH)FLOORPLAN', None, None),
    (r'(?<!\d)(\d+)(?:ST|ND|RD|TH)(\d+)(?:ST|ND|RD|TH)FLOORPLAN',   None, None),
    (r'(?<!\d)1STFLOORPLAN',   "1st",   [1]),
    (r'(?<!\d)2NDFLOORPLAN',   "2nd",   [2]),
    (r'(?<!\d)3RDFLOORPLAN',   "3rd",   [3]),
    (r'(?<!\d)4THFLOORPLAN',   "4th",   [4]),
    (r'(?<!\d)5THFLOORPLAN',   "5th",   [5]),
    (r'(?<!\d)6THFLOORPLAN',   "6th",   [6]),
    (r'(?<!\d)7THFLOORPLAN',   "7th",   [7]),
    (r'(?<!\d)8THFLOORPLAN',   "8th",   [8]),
    (r'(?<!\d)9THFLOORPLAN',   "9th",   [9]),
    (r'(?<!\d)10THFLOORPLAN',  "10th",  [10]),
    (r'(?<!\d)11THFLOORPLAN',  "11th",  [11]),
    (r'(?<!\d)12THFLOORPLAN',  "12th",  [12]),
    (r'(?<!\d)13THFLOORPLAN',  "13th",  [13]),
    (r'(?<!\d)14THFLOORPLAN',  "14th",  [14]),
    (r'(?<!\d)15THFLOORPLAN',  "15th",  [15]),
    (r'(?<!\d)16THFLOORPLAN',  "16th",  [16]),
    (r'(?<!\d)(\d+)(?:ST|ND|RD|TH)FLOORPLAN', None, None),
]


def _normalise(text):
    return re.sub(r'[^A-Z0-9]', '', text.upper())


def _ordinal(n):
    if n == 0:   return "Ground"
    if n == -1:  return "Basement"
    if n == 999: return "Terrace"
    sfx = {1: "st", 2: "nd", 3: "rd"}
    s = sfx.get(n % 10, "th") if n % 100 not in (11, 12, 13) else "th"
    return f"{n}{s}"


def _match_norm(norm):
    if not (norm.endswith("PLAN") or norm == "TERRACEOPEN"):
        return None, None
    for pattern, label, floors in FLOOR_PATTERNS:
        m = re.search(pattern, norm)
        if not m:
            continue
        if label is not None and floors is not None:
            return label, floors
        if label is None and floors is None:
            try:
                if m.lastindex and m.lastindex >= 2:
                    s, e = int(m.group(1)), int(m.group(2))
                    nums = list(range(min(s, e), max(s, e) + 1))
                    short = f"{_ordinal(min(s,e))}-{_ordinal(max(s,e))}"
                    return short, nums
                elif m.lastindex:
                    n = int(m.group(1))
                    return _ordinal(n), [n]
            except (ValueError, IndexError):
                pass
    return None, None


def _word_looks_like_floor_start(text):
    t = text.upper().strip()
    if re.fullmatch(r'[\d.]+', t):
        return False
    if not re.search(r'[A-Z]', t):
        return False
    if t in ("GROUND", "BASEMENT", "TERRACE", "TYPICAL"):
        return True
    if re.fullmatch(r'\d{1,2}(?:ST|ND|RD|TH)', t):
        return True
    return False


def _find_floor_labels_on_page(page, page_width):
    RIGHT_EDGE = 0.83
    results = {}
    words = page.extract_words(keep_blank_chars=False, x_tolerance=3, y_tolerance=3)
    words = [w for w in words if w["x0"] / page_width < RIGHT_EDGE]
    if not words:
        return results

    for w in words:
        norm = _normalise(w["text"])
        short, nums = _match_norm(norm)
        if short and short not in results:
            results[short] = nums

    words_sorted = sorted(words, key=lambda w: (round(w["top"] / 5), w["x0"]))
    lines = []
    cur = [words_sorted[0]]
    for w in words_sorted[1:]:
        if abs(w["top"] - cur[-1]["top"]) <= 5:
            cur.append(w)
        else:
            lines.append(cur)
            cur = [w]
    lines.append(cur)

    for line in lines:
        for size in (5, 4, 3, 2):
            for i in range(len(line) - size + 1):
                if not _word_looks_like_floor_start(line[i]["text"]):
                    continue
                chunk = " ".join(w["text"] for w in line[i:i + size])
                norm = _normalise(chunk)
                short, nums = _match_norm(norm)
                if short and short not in results:
                    results[short] = nums

    return results


def _make_page_label(floor_labels):
    if not floor_labels:
        return ""
    def sort_key(item):
        nums = item[1]
        if not nums: return 9999
        n = min(nums)
        return 9998 if n == 999 else (n + 1000 if n < 0 else n)
    sorted_labels = [lbl for lbl, _ in sorted(floor_labels.items(), key=sort_key)]
    if len(sorted_labels) == 1:
        return f"{sorted_labels[0]} Floor Plan"
    return ", ".join(sorted_labels) + " Floor Plans"


def _all_floor_numbers(floor_labels):
    nums = set()
    for n_list in floor_labels.values():
        if n_list:
            nums.update(n_list)
    return sorted(nums)


def _rasterize_page(pdf_path, page_number, dpi=180):
    try:
        import pypdfium2
        pdf = pypdfium2.PdfDocument(pdf_path)
        page = pdf[page_number]
        bitmap = page.render(scale=dpi / 72)
        img = bitmap.to_pil().convert("RGB")
        pdf.close()
        return img
    except Exception:
        pass
    try:
        import subprocess, tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            prefix = os.path.join(tmpdir, "page")
            subprocess.run(
                ["pdftoppm", "-png", "-r", str(dpi),
                 "-f", str(page_number + 1), "-l", str(page_number + 1),
                 pdf_path, prefix],
                check=True, capture_output=True,
            )
            pngs = list(Path(tmpdir).glob("*.png"))
            if pngs:
                return Image.open(pngs[0]).copy().convert("RGB")
    except Exception:
        pass
    with pdfplumber.open(pdf_path) as pdf:
        p = pdf.pages[page_number]
        img = p.to_image(resolution=dpi)
        return img.original.convert("RGB")


async def process_floorplan_pdf(pdf_path, building_id):
    safe_id = re.sub(r'[^a-zA-Z0-9_-]', '_', building_id)
    output_dir = NOC_DATA_DIR / safe_id / "floorplans"
    output_dir.mkdir(parents=True, exist_ok=True)

    with pdfplumber.open(pdf_path) as pdf:
        page_count = len(pdf.pages)
        page_widths = [p.width for p in pdf.pages]
        page_labels = [
            _find_floor_labels_on_page(pdf.pages[i], page_widths[i])
            for i in range(page_count)
        ]

    all_plans = []
    for page_num in range(page_count):
        labels = page_labels[page_num]
        if labels:
            page_label = _make_page_label(labels)
            floor_nums = _all_floor_numbers(labels)
        else:
            page_label = f"Sheet {page_num + 1}"
            floor_nums = []

        img = _rasterize_page(pdf_path, page_num)
        safe_label = re.sub(r'[^a-z0-9]+', '_', page_label.lower()).strip('_')[:80]
        filename = f"page{page_num + 1}_{safe_label}.png"
        out_path = output_dir / filename
        img.save(str(out_path), "PNG", optimize=True)

        all_plans.append({
            "floor_label": page_label,
            "floor_numbers": floor_nums,
            "image_path": str(out_path.relative_to(NOC_DATA_DIR)),
            "page_number": page_num,
            "building_id": building_id,
        })
    return all_plans


def get_floorplan_for_floor(floor_plans, floor_number):
    if not floor_plans:
        return None
    def _nums(plan):
        n = plan.get("floor_numbers", [])
        if isinstance(n, str):
            try: n = json.loads(n)
            except: n = []
        return n
    for plan in floor_plans:
        if floor_number in _nums(plan):
            return plan
    best, best_d = None, float("inf")
    for plan in floor_plans:
        nums = _nums(plan)
        if not nums: continue
        d = min(abs(floor_number - n) for n in nums)
        if d < best_d:
            best_d, best = d, plan
    return best


def get_all_floorplans(floor_plans):
    def _min(plan):
        n = plan.get("floor_numbers", [])
        if isinstance(n, str):
            try: n = json.loads(n)
            except: n = []
        return min(n) if n else 9999
    return sorted(floor_plans, key=_min)