"""Download Indian instrument BGM from specific Pixabay sound effect pages."""
import requests, re, time
from pathlib import Path

SOUNDS_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public" / "sounds"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

# Known Pixabay Indian instrumental tracks (sound effects, not music)
PIXABAY_PAGES = {
    "bgm_menu": [
        # Sitar/instrumental tracks suitable for menu background
        "https://pixabay.com/sound-effects/sitar-215153/",
        "https://pixabay.com/sound-effects/tabla-music-india-275655/",
        "https://pixabay.com/sound-effects/indian-beats-1-275651/",
        "https://pixabay.com/sound-effects/short-indian-tabla-loop-275654/",
        "https://pixabay.com/sound-effects/indian-tabla-fast-loop-275653/",
        "https://pixabay.com/sound-effects/tabla-loop-90bpm-275652/",
        "https://pixabay.com/sound-effects/tabla-1-275656/",
        "https://pixabay.com/sound-effects/tabla-2-275650/",
    ],
    "bgm_game": [
        # Longer/more energetic tracks for gameplay
        "https://pixabay.com/sound-effects/indian-beats-1-275651/",
        "https://pixabay.com/sound-effects/sitar-215153/",
        "https://pixabay.com/sound-effects/tabla-music-india-275655/",
        "https://pixabay.com/sound-effects/indian-tabla-fast-loop-275653/",
    ],
}

def get_download_url(page_url):
    """Extract the download URL from a Pixabay sound effect page."""
    try:
        r = requests.get(page_url, headers=HEADERS, timeout=20)
        if r.status_code != 200:
            return None
        
        # Pixabay stores download URL in a data-attribute or script tag
        # Pattern 1: data-download-url attribute
        m = re.search(r'data-download-url\s*=\s*["\']([^"\']+)["\']', r.text)
        if m:
            return m.group(1)
        
        # Pattern 2: downloadUrl in JSON-LD
        m = re.search(r'"downloadUrl"\s*:\s*"([^"]+)"', r.text)
        if m:
            return m.group(1)
        
        # Pattern 3: direct download link in href
        m = re.search(r'href=["\']([^"\']+)["\']>Free download<', r.text, re.IGNORECASE)
        if m:
            return m.group(1)
        
        # Pattern 4: Look for cdn.pixabay.com/audio in the page
        m = re.search(r'(https?://cdn\.pixabay\.com/[^"\']+)', r.text)
        if m:
            return m.group(1)
        
        return None
    except Exception as e:
        print(f"    Error: {e}")
        return None

def download_track(url, path, label):
    try:
        r = requests.get(url, headers=HEADERS, timeout=60)
        if r.status_code == 200 and len(r.content) > 20000:
            with open(str(path), "wb") as f:
                f.write(r.content)
            size_kb = len(r.content) / 1024
            print(f"  OK {label}: {size_kb:.0f}KB -> {path.name}")
            return True
        else:
            print(f"  FAIL {label}: HTTP {r.status_code}, size={len(r.content)}")
            return False
    except Exception as e:
        print(f"  FAIL {label}: {e}")
        return False

def main():
    print("=== Download Indian BGM from Pixabay Sound Effects ===\n")
    
    for name, pages in PIXABAY_PAGES.items():
        path = SOUNDS_DIR / f"{name}.wav"
        print(f"\n--- {name} ---")
        
        downloaded = False
        for page_url in pages:
            print(f"  Trying: {page_url}")
            dl_url = get_download_url(page_url)
            if dl_url:
                print(f"    Found: {dl_url[:100]}")
                time.sleep(1)
                if download_track(dl_url, path, name):
                    downloaded = True
                    break
            else:
                print(f"    No download URL found")
            time.sleep(0.5)
        
        if not downloaded:
            print(f"  FAILED: Could not download {name}")
    
    print("\n=== Done ===")

if __name__ == "__main__":
    main()
