"""
deep_research.py
----------------
Deep research module for a single business listing.
Extracts detailed information from Google Maps and the business website.

Usage:
    python deep_research.py --listing-url "https://www.google.com/maps/place/..." --output result.json
    python deep_research.py --listing-url "..." --website-url "https://example.com" --output result.json

Output: JSON file with photos, hours, email, social media, reviews, website screenshot.
"""

import argparse
import json
import logging
import re
import sys
import time
from pathlib import Path

logger = logging.getLogger(__name__)


def extract_business_hours(page) -> dict:
    """Extract business hours from Google Maps listing."""
    hours = {}
    try:
        # Try to find the hours button using resilient selectors
        hours_button = page.locator('button[data-item-id="oh"], button[aria-label*="Horario"], button[aria-label*="Hours"], div.OqSTJd').first
        if hours_button.is_visible(timeout=3000):
            hours_button.click()
            time.sleep(1)

            # Parse hours table - look for table rows with 2 cells
            rows = page.locator('table tr').all()
            for row in rows:
                cells = row.locator('td').all()
                if len(cells) >= 2:
                    day = cells[0].inner_text().strip()
                    time_val = cells[1].inner_text().strip()
                    if day and time_val:
                        hours[day] = time_val
    except Exception as e:
        logger.warning(f"Could not extract hours: {e}")
    return hours


def extract_photos(page, max_photos: int = 25) -> list[str]:
    """Extract photo URLs from Google Maps listing."""
    photos = []
    try:
        # Resilient photo button selectors
        photo_btn = page.locator('button:has-text("Fotos"), button:has-text("Photos"), button[aria-label*="Foto"], button[aria-label*="Photo"]').first
        
        # Fallback to the big hero image
        if not photo_btn.is_visible(timeout=3000):
            photo_btn = page.locator('button[jsaction*="heroHeaderImage"]').first

        if photo_btn.is_visible(timeout=2000):
            photo_btn.click()
            time.sleep(2)

            # Scroll to lazy-load more images
            try:
                # Hover over the middle of the screen where the gallery likely is
                page.mouse.move(300, 400)
                for _ in range(8):
                    page.mouse.wheel(0, 2000)
                    time.sleep(0.8)
            except Exception as e:
                logger.warning(f"Error while scrolling photos: {e}")

            # Extract both <img> src and background-image URLs
            urls = page.evaluate('''() => {
                const result = new Set();
                document.querySelectorAll('*').forEach(el => {
                    if (el.tagName === 'IMG' && el.src) result.add(el.src);
                    const bg = window.getComputedStyle(el).backgroundImage;
                    if (bg && bg !== 'none') {
                        const match = bg.match(/url\("?(.+?)"?\)/);
                        if (match) result.add(match[1]);
                    }
                });
                return Array.from(result);
            }''')

            seen_base = set()
            for src in urls:
                if src and ("googleusercontent" in src or "ggpht.com" in src):
                    # Get base URL to prevent duplicates
                    base_url = src.split('=')[0]
                    if base_url not in seen_base:
                        seen_base.add(base_url)
                        
                        # Upgrade resolution
                        high_res = re.sub(r'=w\d+-h\d+', '=w800-h600', src)
                        high_res = re.sub(r'=s\d+', '=s800', high_res)
                        photos.append(high_res)
                
                if len(photos) >= max_photos:
                    break

            # Go back to listing
            try:
                close_btn = page.locator('button[aria-label*="Cerrar"], button[aria-label*="Close"]').first
                if close_btn.is_visible(timeout=1000):
                    close_btn.click()
                else:
                    page.go_back()
            except:
                page.go_back()
                
            time.sleep(1)

    except Exception as e:
        logger.warning(f"Could not extract photos: {e}")
    return photos[:max_photos]


def extract_reviews(page, max_reviews: int = 5) -> list[dict]:
    """Extract top reviews from the listing."""
    reviews = []
    try:
        # Resilient reviews tab selectors
        reviews_btn = page.locator('button:has-text("Reseñas"), button:has-text("Reviews"), button[aria-label*="Reseña"], button[aria-label*="Review"], [data-tab-index="1"]').first

        if reviews_btn.is_visible(timeout=3000):
            reviews_btn.click()
            time.sleep(2)

            # Find all potential review blocks
            # A review block typically has a button to expand text
            review_blocks = page.locator('div[data-review-id], div[aria-label*="Reseña"], div[aria-label*="Review"]').all()
            
            if not review_blocks:
                # Generic fallback: look for containers with 5 stars
                review_blocks = page.locator('div:has(span[aria-label*="estrellas"]), div:has(span[aria-label*="stars"])').all()

            for elem in review_blocks:
                try:
                    if len(reviews) >= max_reviews:
                        break

                    text = ""
                    author = ""
                    rating = 5 # default assumption if we found it
                    date = ""

                    # Expand "More" button if exists
                    more_btn = elem.locator('button:has-text("Más"), button:has-text("More")').first
                    if more_btn.is_visible(timeout=500):
                        more_btn.click()
                        time.sleep(0.5)

                    raw_text = elem.inner_text()
                    lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
                    
                    if len(lines) >= 2:
                        author = lines[0]
                        # Often the date is in the 2nd or 3rd line
                        for line in lines[1:4]:
                            if "hace" in line.lower() or "ago" in line.lower():
                                date = line
                                break
                        
                        # The actual text is usually the longest line
                        text = max(lines, key=len)

                    # Try to find specific stars
                    stars_el = elem.locator('[role="img"][aria-label*="estrellas"], [role="img"][aria-label*="stars"]').first
                    if stars_el.is_visible(timeout=500):
                        label = stars_el.get_attribute("aria-label") or ""
                        nums = re.findall(r'(\d)', label)
                        if nums:
                            rating = int(nums[0])

                    if text and len(text) > 10:
                        reviews.append({
                            "author": author,
                            "rating": rating,
                            "text": text[:300],
                            "relative_date": date,
                        })
                except Exception:
                    continue

            # Go back to main listing
            page.go_back()
            time.sleep(1)

    except Exception as e:
        logger.warning(f"Could not extract reviews: {e}")
    return reviews


def extract_attributes(page) -> list[str]:
    """Extract business attributes from the listing."""
    attributes = []
    try:
        # Click on "Acerca de" / "About" if possible
        about_btn = page.locator('button:has-text("Acerca de"), button:has-text("About"), button[aria-label*="Acerca"], button[aria-label*="About"]').first
        if about_btn.is_visible(timeout=2000):
            about_btn.click()
            time.sleep(1)

        # Look for tick marks / checkmarks
        attr_elements = page.locator('li:has(img[src*="check"]), div:has(img[src*="check"]) span').all()
        for el in attr_elements[:15]:
            text = el.inner_text().strip()
            if text and len(text) < 50 and text not in attributes:
                attributes.append(text)
                
        # Go back
        if about_btn.is_visible():
            page.go_back()
            time.sleep(1)
            
    except Exception as e:
        logger.warning(f"Could not extract attributes: {e}")
    return attributes


def find_social_links(page) -> dict:
    """Find Facebook and Instagram links on a page."""
    social = {"facebook_url": None, "instagram_url": None}
    try:
        all_links = page.locator('a[href]').all()
        for link in all_links:
            href = (link.get_attribute("href") or "").lower()
            if "facebook.com/" in href and not social["facebook_url"]:
                social["facebook_url"] = link.get_attribute("href")
            if "instagram.com/" in href and not social["instagram_url"]:
                social["instagram_url"] = link.get_attribute("href")
    except Exception as e:
        logger.warning(f"Could not find social links: {e}")
    return social


def find_email(page) -> str | None:
    """Find email address on a page."""
    try:
        text = page.inner_text("body")
        emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
        filtered = [e for e in emails if not any(x in e.lower() for x in ['example', 'test', 'email', 'correo', 'sentry', 'wixpress', 'google'])]
        return filtered[0] if filtered else None
    except Exception:
        return None


def take_website_screenshot(page, url: str, output_path: str) -> str | None:
    """Take a screenshot of a website."""
    try:
        page.goto(url, timeout=15000, wait_until="domcontentloaded")
        time.sleep(2)
        page.screenshot(path=output_path, full_page=False)
        return output_path
    except Exception as e:
        logger.warning(f"Could not screenshot website: {e}")
        return None


def deep_research(listing_url: str, website_url: str | None = None, output_dir: str = "/tmp") -> dict:
    from playwright.sync_api import sync_playwright

    result = {
        "success": False,
        "listing_url": listing_url,
        "photos": [],
        "business_hours": {},
        "email": None,
        "facebook_url": None,
        "instagram_url": None,
        "attributes": [],
        "top_reviews": [],
        "website_screenshot_path": None,
        "seo_summary": None,
        "scraped_at": None,
    }

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={"width": 1280, "height": 800},
                locale="es-MX",
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            )
            page = context.new_page()
            page.set_default_timeout(10000)

            # Navigate to Google Maps listing
            logger.info(f"Navigating to listing: {listing_url}")
            page.goto(listing_url, wait_until="domcontentloaded", timeout=20000)
            time.sleep(4)

            # Accept cookies if prompted
            try:
                consent = page.locator('button:has-text("Aceptar"), button:has-text("Accept"), button:has-text("Acepto")').first
                if consent.is_visible(timeout=2000):
                    consent.click()
                    time.sleep(1)
            except Exception:
                pass

            # Extract data from listing
            result["business_hours"] = extract_business_hours(page)
            result["attributes"] = extract_attributes(page)

            # Find email on Maps page
            maps_email = find_email(page)
            if maps_email:
                result["email"] = maps_email

            maps_social = find_social_links(page)
            result["facebook_url"] = maps_social.get("facebook_url")
            result["instagram_url"] = maps_social.get("instagram_url")

            # Extract photos & reviews
            result["photos"] = extract_photos(page)
            
            if listing_url not in page.url:
                page.goto(listing_url, wait_until="domcontentloaded", timeout=15000)
                time.sleep(2)
                
            result["top_reviews"] = extract_reviews(page)

            # Website research
            if website_url:
                logger.info(f"Researching website: {website_url}")
                try:
                    web_url = website_url if website_url.startswith("http") else f"https://{website_url}"
                    screenshot_path = str(Path(output_dir) / f"screenshot_{int(time.time())}.png")
                    result["website_screenshot_path"] = take_website_screenshot(page, web_url, screenshot_path)

                    if not result["email"]:
                        result["email"] = find_email(page)

                    web_social = find_social_links(page)
                    if not result["facebook_url"]:
                        result["facebook_url"] = web_social.get("facebook_url")
                    if not result["instagram_url"]:
                        result["instagram_url"] = web_social.get("instagram_url")

                    result["seo_summary"] = {
                        "page_title": page.title(),
                        "has_meta_description": bool(page.locator('meta[name="description"]').count()),
                        "mobile_friendly": bool(page.locator('meta[name="viewport"]').count()),
                    }
                except Exception as e:
                    logger.warning(f"Website research failed: {e}")

            browser.close()

            result["success"] = True
            result["scraped_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    except Exception as e:
        logger.error(f"Deep research failed: {e}")
        result["error"] = str(e)

    return result

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)-8s %(name)s | %(message)s")
    parser = argparse.ArgumentParser(description="Deep research a single business")
    parser.add_argument("--listing-url", required=True)
    parser.add_argument("--website-url", default=None)
    parser.add_argument("--output", required=True)
    parser.add_argument("--output-dir", default="/tmp")
    args = parser.parse_args()

    result = deep_research(args.listing_url, args.website_url, args.output_dir)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    if result["success"]:
        print(f"✅ Deep research complete. Output: {args.output}")
        print(f"   Photos: {len(result['photos'])}")
        print(f"   Reviews: {len(result['top_reviews'])}")
        print(f"   Hours: {'Yes' if result['business_hours'] else 'No'}")
    else:
        print(f"❌ Deep research failed: {result.get('error', 'Unknown error')}")
        sys.exit(1)
