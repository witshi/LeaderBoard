const API_BASE = "../api";

async function parseJsonSafe(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      error: "Phản hồi từ server không phải JSON hợp lệ.",
      raw: text,
    };
  }
}

export async function fetchScores() {
  const response = await fetch(`${API_BASE}/get_scores.php`, {
    method: "GET",
    headers: { "Accept": "application/json" },
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Không thể tải danh sách điểm.");
  }

  return payload.data || [];
}

export async function submitScore(username, score, clientId) {
  const response = await fetch(`${API_BASE}/post_score.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ username, score, client_id: clientId }),
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok || !payload.success) {
    const error = new Error(payload.error || "Cập nhật điểm thất bại.");
    error.status = response.status;
    error.details = payload.details || null;
    error.retryAfter = payload.retry_after || null;
    throw error;
  }

  return payload;
}
