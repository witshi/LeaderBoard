import { RedBlackTree } from "./rbt.js";
import { BinarySearchTree } from "./bst.js";
import { fetchScores, submitScore, deletePlayer } from "./api.js";

const tree = new RedBlackTree();
const bst = new BinarySearchTree();
const state = {
  scoresByUser: new Map(),
};
const rbtLastPositions = new Map();
const bstLastPositions = new Map();
const ANIMATION_MS = 1000;

const rbtSvg = document.getElementById("rbtSvg");
const bstSvg = document.getElementById("bstSvg");
const form = document.getElementById("scoreForm");
const usernameInput = document.getElementById("username");
const scoreInput = document.getElementById("score");
const submitBtn = document.getElementById("submitBtn");
const leaveBtn = document.getElementById("leaveBtn");
const statusText = document.getElementById("statusText");
const rankText = document.getElementById("rankText");
const rbtTimeText = document.getElementById("rbtTime");
const bstTimeText = document.getElementById("bstTime");

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
  leaveBtn.disabled = localStorage.getItem("lb_username") ? false : true;
}

function restoreLocalUser() {
  const saved = localStorage.getItem("lb_username");
  if (saved && saved.trim() !== "") {
    usernameInput.value = saved;
    usernameInput.disabled = true;
    submitBtn.textContent = "Cập nhật điểm";
    leaveBtn.disabled = false;
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
  leaveBtn.disabled = false;
}

function resetLocalUser() {
  localStorage.removeItem("lb_username");
  usernameInput.disabled = false;
  usernameInput.value = "";
  submitBtn.textContent = "Tham gia vào bảng xếp hạng";
  leaveBtn.disabled = true;
  rankText.textContent = "Rank của bạn: chưa có";
}

function toSortedRankList(players) {
  return [...players].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    if (a.scoreAchievedAt !== b.scoreAchievedAt) {
      return a.scoreAchievedAt.localeCompare(b.scoreAchievedAt);
    }

    if (a.id !== b.id) {
      return a.id - b.id;
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

function drawTree(svg, activeTree, lastPositions) {
  const width = 1400;
  const height = 900;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = "";

  activeTree.assignPositions(width, 110);
  const top10 = new Set(toSortedRankList(tree.reverseInOrder()).slice(0, 10).map((p) => p.username));

  const animatedEdges = [];
  const animatedNodes = [];
  let hasMotion = false;
  const nextPositions = new Map();

  for (const [parent, child] of activeTree.edges()) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("class", "tree-edge");

    const prevParent = lastPositions.get(parent.player.username);
    const prevChild = lastPositions.get(child.player.username);
    const startX1 = prevParent ? prevParent.x : parent.x;
    const startY1 = prevParent ? prevParent.y : parent.y;
    const startX2 = prevChild ? prevChild.x : child.x;
    const startY2 = prevChild ? prevChild.y : child.y;

    line.setAttribute("x1", String(startX1));
    line.setAttribute("y1", String(startY1));
    line.setAttribute("x2", String(startX2));
    line.setAttribute("y2", String(startY2));
    line.setAttribute("stroke", "#a9bcd0");
    line.setAttribute("stroke-width", "2");
    svg.appendChild(line);

    if (startX1 !== parent.x || startY1 !== parent.y || startX2 !== child.x || startY2 !== child.y) {
      hasMotion = true;
      animatedEdges.push({ line, parent, child });
    }
  }

  for (const node of activeTree.nodes()) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "tree-node");
    group.dataset.username = node.player.username;

    const previous = lastPositions.get(node.player.username);
    const startX = previous ? previous.x : node.x;
    const startY = previous ? previous.y : node.y;
    group.setAttribute("transform", `translate(${startX}, ${startY})`);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "0");
    circle.setAttribute("cy", "0");
    circle.setAttribute("r", "28");
    circle.setAttribute("fill", node.color === "RED" ? "#e63946" : "#1b1b1e");
    circle.setAttribute("stroke", top10.has(node.player.username) ? "#ffd166" : "#f1faee");
    circle.setAttribute("stroke-width", top10.has(node.player.username) ? "4" : "2");
    if (top10.has(node.player.username)) {
      circle.style.filter = "drop-shadow(0px 0px 8px #ffd166)";
    }

    const userText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    userText.setAttribute("x", "0");
    userText.setAttribute("y", "-7");
    userText.setAttribute("class", "node-label");
    userText.textContent = node.player.username;

    const scoreText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    scoreText.setAttribute("x", "0");
    scoreText.setAttribute("y", "11");
    scoreText.setAttribute("class", "node-score");
    scoreText.textContent = String(node.player.score);

    group.appendChild(circle);
    group.appendChild(userText);
    group.appendChild(scoreText);
    svg.appendChild(group);

    nextPositions.set(node.player.username, { x: node.x, y: node.y });
    if (startX !== node.x || startY !== node.y) {
      hasMotion = true;
      animatedNodes.push({ group, x: node.x, y: node.y });
    }
  }

  if (!hasMotion) {
    lastPositions.clear();
    for (const [username, pos] of nextPositions.entries()) {
      lastPositions.set(username, pos);
    }
    return;
  }

  requestAnimationFrame(() => {
    for (const item of animatedEdges) {
      item.line.classList.add("is-moving");
      item.line.setAttribute("x1", String(item.parent.x));
      item.line.setAttribute("y1", String(item.parent.y));
      item.line.setAttribute("x2", String(item.child.x));
      item.line.setAttribute("y2", String(item.child.y));
    }

    for (const item of animatedNodes) {
      item.group.classList.add("is-moving");
      item.group.setAttribute("transform", `translate(${item.x}, ${item.y})`);
    }
  });

  setTimeout(() => {
    for (const item of animatedEdges) {
      item.line.classList.remove("is-moving");
    }
    for (const item of animatedNodes) {
      item.group.classList.remove("is-moving");
    }
  }, ANIMATION_MS);

  lastPositions.clear();
  for (const [username, pos] of nextPositions.entries()) {
    lastPositions.set(username, pos);
  }
}

function syncTreeWithApiData(scores) {
  const incoming = new Map(
    scores.map((item) => [
      item.username,
      {
        id: Number(item.id),
        score: Number(item.score),
        scoreAchievedAt: String(item.score_achieved_at || "9999-12-31 23:59:59"),
      },
    ])
  );

  const rbtStart = performance.now();
  for (const [username, oldData] of state.scoresByUser.entries()) {
    if (!incoming.has(username)) {
      tree.delete(tree.makeKey(oldData.score, oldData.scoreAchievedAt, oldData.id, username));
    }
  }

  for (const [username, newData] of incoming.entries()) {
    const oldData = state.scoresByUser.get(username);
    if (oldData === undefined) {
      tree.insert({
        username,
        id: newData.id,
        score: newData.score,
        scoreAchievedAt: newData.scoreAchievedAt,
      });
      continue;
    }

    if (
      oldData.score !== newData.score ||
      oldData.scoreAchievedAt !== newData.scoreAchievedAt ||
      oldData.id !== newData.id
    ) {
      tree.delete(tree.makeKey(oldData.score, oldData.scoreAchievedAt, oldData.id, username));
      tree.insert({
        username,
        id: newData.id,
        score: newData.score,
        scoreAchievedAt: newData.scoreAchievedAt,
      });
    }
  }
  const rbtEnd = performance.now();

  const bstStart = performance.now();
  for (const [username, oldData] of state.scoresByUser.entries()) {
    if (!incoming.has(username)) {
      bst.delete(bst.makeKey(oldData.score, oldData.scoreAchievedAt, oldData.id, username));
    }
  }

  for (const [username, newData] of incoming.entries()) {
    const oldData = state.scoresByUser.get(username);
    if (oldData === undefined) {
      bst.insert({
        username,
        id: newData.id,
        score: newData.score,
        scoreAchievedAt: newData.scoreAchievedAt,
      });
      continue;
    }

    if (
      oldData.score !== newData.score ||
      oldData.scoreAchievedAt !== newData.scoreAchievedAt ||
      oldData.id !== newData.id
    ) {
      bst.delete(bst.makeKey(oldData.score, oldData.scoreAchievedAt, oldData.id, username));
      bst.insert({
        username,
        id: newData.id,
        score: newData.score,
        scoreAchievedAt: newData.scoreAchievedAt,
      });
    }
  }
  const bstEnd = performance.now();

  rbtTimeText.textContent = `RBT: ${Math.max(0, rbtEnd - rbtStart).toFixed(2)} ms`;
  bstTimeText.textContent = `BST: ${Math.max(0, bstEnd - bstStart).toFixed(2)} ms`;

  state.scoresByUser = incoming;
}

async function refreshScores(silent = false) {
  try {
    const scores = await fetchScores();
    syncTreeWithApiData(scores);
    drawTree(rbtSvg, tree, rbtLastPositions);
    drawTree(bstSvg, bst, bstLastPositions);
    updateRankText();
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

leaveBtn.addEventListener("click", async () => {
  const username = localStorage.getItem("lb_username") || "";
  if (!username) {
    setStatus("Bạn chưa tham gia bảng xếp hạng.");
    leaveBtn.disabled = true;
    return;
  }

  try {
    const clientId = getOrCreateClientId();
    await deletePlayer(username, clientId);
    resetLocalUser();
    setStatus("Bạn đã rời khỏi cuộc chơi.");
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
