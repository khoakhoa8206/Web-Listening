import { YoutubeTranscript } from "youtube-transcript";
import { ProxyAgent, fetch as undiciFetch } from "undici";

/**
 * Các hàm dùng chung để làm việc với YouTube:
 * - extractVideoId: lấy id từ nhiều dạng link
 * - fetchVideoTitle: lấy tiêu đề thật qua oEmbed (không cần API key)
 * - fetchTranscript: lấy transcript thật (có timestamp) qua thư viện youtube-transcript
 * - searchVideos: tìm video thật qua YouTube Data API v3 (cần YOUTUBE_API_KEY)
 *
 * LƯU Ý QUAN TRỌNG VỀ LỖI "too many requests ... captcha":
 * Lỗi này không phải do gọi quá nhiều lần, mà do IP dùng chung của các nền tảng
 * hosting (Render, Vercel, Railway, Heroku...) đã bị YouTube liệt vào danh sách
 * chặn bot ở cấp IP. Vì vậy request nào từ server cũng sẽ bị chặn, bất kể tần suất.
 * Cách khắc phục: cho request đi qua một proxy (dân dụng hoặc datacenter "sạch")
 * bằng cách set biến môi trường YT_PROXY_URL, ví dụ:
 *   YT_PROXY_URL=http://user:pass@proxy-host:port
 * Nếu không set biến này, hệ thống vẫn chạy như cũ (fetch trực tiếp, không proxy).
 */

const PROXY_URL = process.env.YT_PROXY_URL;
let proxyAgent = null;
function getProxyFetch() {
  if (!PROXY_URL) return undefined;
  if (!proxyAgent) proxyAgent = new ProxyAgent(PROXY_URL);
  return (url, options = {}) => undiciFetch(url, { ...options, dispatcher: proxyAgent });
}

// Cache transcript theo videoId trong bộ nhớ, TTL dài (transcript video hầu như
// không đổi) để tránh gọi lại YouTube/proxy nhiều lần cho cùng 1 video.
const TRANSCRIPT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 giờ
const transcriptCache = new Map(); // videoId -> { result, expiresAt }

function getCachedTranscript(videoId) {
  const hit = transcriptCache.get(videoId);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    transcriptCache.delete(videoId);
    return null;
  }
  return hit.result;
}

function setCachedTranscript(videoId, result) {
  transcriptCache.set(videoId, { result, expiresAt: Date.now() + TRANSCRIPT_CACHE_TTL_MS });
}

export function extractVideoId(url) {
  if (!url) return null;
  const m = String(url).match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/
  );
  return m ? m[1] : null;
}

export async function fetchVideoTitle(url) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.title || null;
  } catch (err) {
    console.error("fetchVideoTitle error:", err.message);
    return null;
  }
}

// Trả về { hasTranscript, transcript } với transcript dạng "[12s] nội dung [18s] nội dung ..."
export async function fetchTranscript(url) {
  const videoId = extractVideoId(url);
  if (!videoId) return { hasTranscript: false, transcript: null };

  const cached = getCachedTranscript(videoId);
  if (cached) return cached;

  const customFetch = getProxyFetch();

  try {
    const items = await YoutubeTranscript.fetchTranscript(
      videoId,
      customFetch ? { fetch: customFetch } : undefined
    );
    if (!items || items.length === 0) {
      const result = { hasTranscript: false, transcript: null };
      setCachedTranscript(videoId, result);
      return result;
    }

    const transcript = items
      .map((i) => `[${Math.floor(i.offset / 1000)}s] ${i.text}`)
      .join(" ");

    const result = { hasTranscript: true, transcript };
    setCachedTranscript(videoId, result);
    return result;
  } catch (err) {
    // youtube-transcript ném lỗi khi video không có phụ đề / bị chặn
    console.error("fetchTranscript error:", err.message);
    // Không cache lỗi captcha/chặn IP — vì đây là lỗi tạm thời theo IP/proxy,
    // có thể tự hết sau khi đổi proxy hoặc YouTube gỡ chặn, nên cần thử lại lần sau.
    return { hasTranscript: false, transcript: null, error: err.message };
  }
}

function parseISODuration(iso) {
  const m = String(iso || "").match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const h = parseInt(m[1] || "0", 10);
  const mnt = parseInt(m[2] || "0", 10);
  const s = parseInt(m[3] || "0", 10);
  const totalMin = h * 60 + mnt;
  return `${totalMin}:${String(s).padStart(2, "0")}`;
}

// Tìm video thật trên YouTube (ưu tiên video có phụ đề) qua YouTube Data API v3
export async function searchVideos(query, { maxResults = 12 } = {}) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Thiếu YOUTUBE_API_KEY trong backend/.env — cần key này để tìm video thật trên YouTube."
    );
  }

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.search = new URLSearchParams({
    key: apiKey,
    part: "snippet",
    type: "video",
    q: query,
    maxResults: String(maxResults),
    videoCaption: "closedCaption", // chỉ lấy video có phụ đề -> AI soạn bài chính xác hơn
    relevanceLanguage: "en",
    safeSearch: "strict",
  }).toString();

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    const body = await searchRes.text();
    throw new Error(`YouTube search API lỗi (${searchRes.status}): ${body}`);
  }
  const searchData = await searchRes.json();
  const ids = (searchData.items || []).map((i) => i.id.videoId).filter(Boolean);
  if (ids.length === 0) return [];

  // Lấy thêm thời lượng video thật
  const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  detailsUrl.search = new URLSearchParams({
    key: apiKey,
    part: "contentDetails",
    id: ids.join(","),
  }).toString();
  const detailsRes = await fetch(detailsUrl);
  const detailsData = detailsRes.ok ? await detailsRes.json() : { items: [] };
  const durationById = Object.fromEntries(
    (detailsData.items || []).map((v) => [v.id, parseISODuration(v.contentDetails.duration)])
  );

  return (searchData.items || []).map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    duration: durationById[item.id.videoId] || "",
  }));
}
