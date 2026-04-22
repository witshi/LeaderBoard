import { RedBlackTree } from "./rbt.js";
import { fetchScores, submitScore } from "./api.js";

const tree = new RedBlackTree();
const state = {
  scoresByUser: new Map(),
};

const svg = document.getElementById("treeSvg");
const form = document.getElementById("scoreForm");
const usernameInput = document.getElementById("username");
const scoreInput = document.getElementById("score");
const submitBtn = document.getElementById("submitBtn");
const statusText = document.getElementById("statusText");
const rankText = document.getElementById("rankText");

function getOrCreateClientId() {
  let clientId = localStorage.getItem("lb_client_id");
  if (clientId && clientId.trim() !== "") {
    return clientId;
  }

  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    clientId = window.crypto.randomUUID();
  } else {
    clientId = `cid_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  }

  localStorage.setItem("lb_client_id", clientId);
  return clientId;
}

function setStatus(message) {
  statusText.textContent = message;
}

function validateForm() {
  const hasUsername = usernameInput.value.trim() !== "";
  const hasScore = scoreInput.value.trim() !== "";
  submitBtn.disabled = !(hasUsername && hasScore);
}

function restoreLocalUser() {
  const saved = localStorage.getItem("lb_username");
  if (saved && saved.trim() !== "") {
    usernameInput.value = saved;
    usernameInput.disabled = true;
    submitBtn.textContent = "Cập nhật điểm";
  }
}

function lockUserAfterFirstJoin() {
  const username = usernameInput.value.trim();
  if (username === "") {
    return;
  }

  localStorage.setItem("lb_username", username);
  usernameInput.disabled = true;
  submitBtn.textContent = "Cập nhật điểm";
}

function toSortedRankList(players) {
  return [...players].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    if (a.scoreAchievedAt !== b.scoreAchievedAt) {
      return a.scoreAchievedAt.localeCompare(b.scoreAchievedAt);
    }

    return a.username.localeCompare(b.username);
  });
}

function updateRankText() {
  const currentUser = localStorage.getItem("lb_username") || "";
  if (!currentUser) {
    rankText.textContent = "Rank của bạn: chưa có";
    return;
  }

  const list = toSortedRankList(tree.reverseInOrder());
  const rankIndex = list.findIndex((item) => item.username === currentUser);

  if (rankIndex === -1) {
    rankText.textContent = "Rank của bạn: chưa có";
    return;
  }

  rankText.textContent = `Rank của bạn: #${rankIndex + 1} (điểm: ${list[rankIndex].score})`;
}

function drawTree() {
  const width = 1400;
  const height = 900;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = "";

  tree.assignPositions(width, 110);
  const top10 = new Set(toSortedRankList(tree.reverseInOrder()).slice(0, 10).map((p) => p.username));

  for (const [parent, child] of tree.edges()) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(parent.x));
    line.setAttribute("y1", String(parent.y));
    line.setAttribute("x2", String(child.x));
    line.setAttribute("y2", String(child.y));
    line.setAttribute("stroke", "#a9bcd0");
    line.setAttribute("stroke-width", "2");
    svg.appendChild(line);
  }

  for (const node of tree.nodes()) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(node.x));
    circle.setAttribute("cy", String(node.y));
    circle.setAttribute("r", "28");
    circle.setAttribute("fill", node.color === "RED" ? "#e63946" : "#1b1b1e");
    circle.setAttribute("stroke", top10.has(node.player.username) ? "#ffd166" : "#f1faee");
    circle.setAttribute("stroke-width", top10.has(node.player.username) ? "4" : "2");
    if (top10.has(node.player.username)) {
      circle.style.filter = "drop-shadow(0px 0px 8px #ffd166)";
    }

    const userText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    userText.setAttribute("x", String(node.x));
    userText.setAttribute("y", String(node.y - 7));
    userText.setAttribute("class", "node-label");
    userText.textContent = node.player.username;

    const scoreText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    scoreText.setAttribute("x", String(node.x));
    scoreText.setAttribute("y", String(node.y + 11));
    scoreText.setAttribute("class", "node-score");
    scoreText.textContent = String(node.player.score);

    group.appendChild(circle);
    group.appendChild(userText);
    group.appendChild(scoreText);
    svg.appendChild(group);
  }

  updateRankText();
}

function syncTreeWithApiData(scores) {
  const incoming = new Map(
    scores.map((item) => [
      item.username,
      {
        score: Number(item.score),
        scoreAchievedAt: String(item.score_achieved_at || "9999-12-31 23:59:59"),
      },
    ])
  );

  for (const [username, oldData] of state.scoresByUser.entries()) {
    if (!incoming.has(username)) {
      tree.delete(tree.makeKey(oldData.score, oldData.scoreAchievedAt, username));
    }
  }

  for (const [username, newData] of incoming.entries()) {
    const oldData = state.scoresByUser.get(username);
    if (oldData === undefined) {
      tree.insert({ username, score: newData.score, scoreAchievedAt: newData.scoreAchievedAt });
      continue;
    }

    if (oldData.score !== newData.score || oldData.scoreAchievedAt !== newData.scoreAchievedAt) {
      tree.delete(tree.makeKey(oldData.score, oldData.scoreAchievedAt, username));
      tree.insert({ username, score: newData.score, scoreAchievedAt: newData.scoreAchievedAt });
    }
  }

  state.scoresByUser = incoming;
}

async function refreshScores(silent = false) {
  try {
    const scores = await fetchScores();
    syncTreeWithApiData(scores);
    drawTree();
    if (!silent) {
      setStatus("Đã đồng bộ dữ liệu leaderboard.");
    }
  } catch (error) {
    setStatus(`Không thể tải dữ liệu: ${error.message}`);
  }
}

function formatError(error) {
  if (error.status === 422 && error.details) {
    const reasons = Object.values(error.details).join(" ");
    return `${error.message} ${reasons}`.trim();
  }

  if (error.status === 429 && error.retryAfter) {
    return `${error.message} (retry_after: ${error.retryAfter}s)`;
  }

  return error.message || "Lỗi không xác định khi cập nhật điểm.";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = usernameInput.value.trim();
  const scoreRaw = scoreInput.value.trim();

  if (!username || scoreRaw === "") {
    setStatus("Bạn cần nhập đầy đủ Username và Điểm số.");
    return;
  }

  const scoreNumber = Number(scoreRaw);
  if (!Number.isInteger(scoreNumber) || scoreNumber < 0 || scoreNumber > 1000) {
    setStatus("Điểm số phải là số nguyên trong khoảng 0 đến 1000.");
    return;
  }

  try {
    const clientId = getOrCreateClientId();
    await submitScore(username, scoreNumber, clientId);
    lockUserAfterFirstJoin();
    scoreInput.value = "";
    validateForm();
    setStatus("Cập nhật điểm thành công.");
    await refreshScores(true);
  } catch (error) {
    setStatus(formatError(error));
  }
});

usernameInput.addEventListener("input", validateForm);
scoreInput.addEventListener("input", validateForm);

restoreLocalUser();
validateForm();
await refreshScores();
setInterval(() => {
  refreshScores(true);
}, 5000);
