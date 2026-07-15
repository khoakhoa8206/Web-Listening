import { YoutubeTranscript } from "youtube-transcript";

/**
 * Các hàm dùng chung để làm việc với YouTube:
 * - extractVideoId: lấy id từ nhiều dạng link
 * - fetchVideoTitle: lấy tiêu đề thật qua oEmbed (không cần API key)
 * - fetchTranscript: lấy transcript thật (có timestamp) qua thư viện youtube-transcript
 * - searchVideos: tìm video thật qua YouTube Data API v3 (cần YOUTUBE_API_KEY)
 */

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

  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    if (!items || items.length === 0) return { hasTranscript: false, transcript: null };

    const transcript = items
      .map((i) => `[${Math.floor(i.offset / 1000)}s] ${i.text}`)
      .join(" ");

    return { hasTranscript: true, transcript };
  } catch (err) {
    // youtube-transcript ném lỗi khi video không có phụ đề / bị chặn
    console.error("fetchTranscript error:", err.message);
    return { hasTranscript: false, transcript: null };
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
