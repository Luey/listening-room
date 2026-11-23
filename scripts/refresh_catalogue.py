"""Refresh the bundled YouTube catalogue from public playlists."""

import json
import re
import subprocess
from concurrent.futures import ThreadPoolExecutor
from itertools import zip_longest
from pathlib import Path
from tempfile import NamedTemporaryFile

PLAYLISTS = [
    ('Dreaming Spanish', 'Superbeginner', 'PLlpPf-YgbU7GbOHc3siOGQ5KmVSngZucl'),
    ('Dreaming Spanish', 'Beginner', 'PLlpPf-YgbU7HWrrenMs3-nuhxgzyAiA-C'),
    ('Dreaming Spanish', 'Intermediate', 'PLlpPf-YgbU7Gssxi9f72cZktgOb4Vpdoy'),
    ('Dreaming Spanish', 'Advanced', 'PLlpPf-YgbU7EQVQR10ztdVrzdU455PDyZ'),
    ('Spanish After Hours', 'Superbeginner', 'PLLFFrODykXG8OPW3Pzg3J7PvQk_YHLSCt'),
    ('Spanish After Hours', 'Beginner', 'PLLFFrODykXG95MQpEK28TGfV4qL0LUlMe'),
    ('Spanish After Hours', 'Intermediate', 'PLLFFrODykXG9-t3QzHXPKqz5YDMy7_JWb'),
    ('Easy Spanish', 'Beginner', 'PLQGxDRfENoxJMWCoj8kszBjr61c-Bq-tW'),
    ('Easy Spanish', 'Beginner', 'PLQGxDRfENoxKq86RU0IYqFIsMFgMRpVf-'),
    ('Easy Spanish', 'Intermediate', 'PLQGxDRfENoxLjuS5SVOsASrAuJfakQQ13'),
    ('VideoEle', 'Beginner', 'PL29747CBC28F65045', 'A1'),
    ('VideoEle', 'Beginner', 'PL03FDED50A440817D', 'A2'),
    ('VideoEle', 'Intermediate', 'PL8437F2EDCF5C2B49', 'B1'),
    ('VideoEle', 'Intermediate', 'PLDAB14043D509488C', 'B2'),
]


def fetch(playlist):
    source, level, playlist_id, *cefr = playlist
    result = subprocess.run(
        [
            "yt-dlp", "--ignore-config", "--no-update", "--flat-playlist",
            "--skip-download", "--dump-single-json",
            f"https://www.youtube.com/playlist?list={playlist_id}",
        ],
        capture_output=True,
        text=True,
        timeout=90,
    )
    if result.returncode:
        raise RuntimeError(f"{source} / {level}: {result.stderr.strip()}")
    data = json.loads(result.stdout)
    videos = []
    for row in data["entries"]:
        if not row:
            continue
        video_id, title = row.get("id"), row.get("title")
        if not video_id or not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
            continue
        if not title or title in {"[Private video]", "[Deleted video]", "[Unavailable video]"}:
            continue
        videos.append({
            "id": video_id,
            "title": title,
            "source": source,
            "level": level,
            "seconds": row.get("duration"),
            "cefr": cefr[0] if cefr else None,
        })
    if not videos:
        raise RuntimeError(f"No usable videos in {source} / {level} ({playlist_id})")
    print(f"{source} / {level}: {len(videos)} videos", flush=True)
    return videos


def main():
    with ThreadPoolExecutor(max_workers=6) as pool:
        groups = list(pool.map(fetch, PLAYLISTS))
    videos = {}
    for row in zip_longest(*groups):
        for video in row:
            if video:
                videos.setdefault(video["id"], video)
    destination = Path(__file__).resolve().parents[1] / "dist" / "catalog.json"
    with NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=destination.parent, delete=False
    ) as file:
        draft = Path(file.name)
        try:
            json.dump(list(videos.values()), file, ensure_ascii=False, separators=(",", ":"))
            file.close()
            draft.replace(destination)
        finally:
            draft.unlink(missing_ok=True)
    print(f"Saved {len(videos)} unique videos to {destination.name}")


if __name__ == "__main__":
    main()
