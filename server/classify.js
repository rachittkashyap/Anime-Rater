import { getCountryForTimezone } from 'countries-and-timezones';

// ---------- Bots ----------
const BOT_RE =
  /bot|crawl|spider|slurp|facebookexternalhit|headless|lighthouse|pagespeed|preview|monitor|uptime|curl|wget|python-requests|axios|node-fetch|go-http|java\//i;

export const isBot = (ua) => !ua || BOT_RE.test(ua);

// ---------- Device / browser ----------
export function parseUserAgent(ua = '') {
  let device = 'Desktop';
  if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) device = 'Tablet';
  else if (/mobi|iphone|ipod|android/i.test(ua)) device = 'Mobile';

  let browser = 'Other';
  if (/FBAN|FBAV|Instagram/i.test(ua)) browser = 'Facebook / Instagram app';
  else if (/edg(e|a|ios)?\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';

  return { device, browser };
}

// ---------- Traffic source ----------
// [host regex, display name, channel]
const KNOWN_SOURCES = [
  [/(^|\.)google\.[a-z.]+$/, 'Google', 'Search'],
  [/(^|\.)bing\.com$/, 'Bing', 'Search'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo', 'Search'],
  [/(^|\.)yahoo\.[a-z.]+$/, 'Yahoo', 'Search'],
  [/(^|\.)ecosia\.org$/, 'Ecosia', 'Search'],
  [/(^|\.)search\.brave\.com$/, 'Brave Search', 'Search'],
  [/(^|\.)yandex\.[a-z.]+$/, 'Yandex', 'Search'],
  [/(^|\.)baidu\.com$/, 'Baidu', 'Search'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'Facebook', 'Social'],
  [/(^|\.)instagram\.com$/, 'Instagram', 'Social'],
  [/^t\.co$|(^|\.)(twitter|x)\.com$/, 'X (Twitter)', 'Social'],
  [/(^|\.)reddit\.com$/, 'Reddit', 'Social'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube', 'Social'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'LinkedIn', 'Social'],
  [/(^|\.)pinterest\.[a-z.]+$/, 'Pinterest', 'Social'],
  [/(^|\.)(t\.me|telegram\.org)$/, 'Telegram', 'Social'],
  [/(^|\.)discord(app)?\.com$/, 'Discord', 'Social'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'WhatsApp', 'Social'],
  [/(^|\.)threads\.net$/, 'Threads', 'Social'],
  [/(^|\.)quora\.com$/, 'Quora', 'Social'],
];

const clean = (v, max = 60) => String(v ?? '').trim().slice(0, max);

export function classifySource({ ref, utmSource, utmMedium, selfHosts = [] }) {
  const source = clean(utmSource);
  if (source) {
    const medium = clean(utmMedium).toLowerCase();
    let channel = 'Campaign';
    if (medium === 'email') channel = 'Email';
    else if (/cpc|ppc|paid/.test(medium)) channel = 'Paid';
    else if (medium === 'social') channel = 'Social';
    return { source, channel };
  }

  const raw = clean(ref, 500);
  if (!raw) return { source: 'Direct', channel: 'Direct' };

  let url;
  try {
    url = new URL(raw);
  } catch {
    return { source: 'Direct', channel: 'Direct' };
  }

  if (url.protocol.startsWith('android-app')) {
    if (url.hostname.includes('googlequicksearchbox')) return { source: 'Google', channel: 'Search' };
    return { source: 'Android app', channel: 'Referral' };
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (!host) return { source: 'Direct', channel: 'Direct' };
  if (selfHosts.some((h) => host === h || host.endsWith(`.${h}`))) return { source: 'Direct', channel: 'Direct' };

  for (const [re, name, channel] of KNOWN_SOURCES) {
    if (re.test(host)) return { source: name, channel };
  }
  return { source: host, channel: 'Referral' };
}

// ---------- Location ----------
// Country comes from the hosting/CDN's IP-geolocation header when there is one
// (Cloudflare, Vercel, CloudFront ...). Otherwise we fall back to the visitor's browser
// timezone, which maps to a country for almost everyone. No IP address is ever stored.
const COUNTRY_HEADERS = [
  'cf-ipcountry',
  'x-vercel-ip-country',
  'cloudfront-viewer-country',
  'x-country-code',
  'x-appengine-country',
];

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

function countryName(code) {
  try {
    return regionNames.of(code) || null;
  } catch {
    return null;
  }
}

export function detectLocation(headers, tz) {
  for (const key of COUNTRY_HEADERS) {
    const code = String(headers[key] ?? '').toUpperCase();
    if (/^[A-Z]{2}$/.test(code) && code !== 'XX' && code !== 'T1') {
      return { cc: code, country: countryName(code) || code };
    }
  }
  if (tz && /^[A-Za-z0-9_+\-/]{1,64}$/.test(tz)) {
    const match = getCountryForTimezone(tz);
    if (match) return { cc: match.id, country: countryName(match.id) || match.name };
  }
  return { cc: null, country: 'Unknown' };
}
