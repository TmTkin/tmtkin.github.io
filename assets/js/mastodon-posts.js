const postsContainer = document.querySelector("#mastodon-posts");
const accountStatusesUrl =
  "https://fedibird.com/api/v1/accounts/115367695659103257/statuses?limit=3&exclude_replies=true&exclude_reblogs=true";

function extractPostText(html) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const blockTags = new Set(["BLOCKQUOTE", "DIV", "LI", "P", "PRE"]);

  function readNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    if (node.tagName === "BR") return "\n";
    if (node.tagName === "IMG") return node.getAttribute("alt") ?? "";

    const text = Array.from(node.childNodes, readNode).join("");
    return blockTags.has(node.tagName) ? `${text}\n` : text;
  }

  return readNode(parsed.body).trim();
}

function appendPostContent(content, status) {
  const emojiByShortcode = new Map(
    (status.emojis ?? []).map((emoji) => [emoji.shortcode, emoji]),
  );
  const text = extractPostText(status.content);
  const shortcodePattern = /:([a-zA-Z0-9_-]+):/g;
  let lastIndex = 0;

  for (const match of text.matchAll(shortcodePattern)) {
    content.append(document.createTextNode(text.slice(lastIndex, match.index)));
    const emoji = emojiByShortcode.get(match[1]);
    let emojiUrl;
    try {
      emojiUrl = new URL(emoji?.static_url);
    } catch {
      emojiUrl = null;
    }

    if (emojiUrl?.protocol === "https:" && emojiUrl.hostname === "s3.fedibird.com") {
      const image = document.createElement("img");
      image.src = emojiUrl.href;
      image.alt = match[0];
      image.title = match[0];
      image.width = 20;
      image.height = 20;
      content.append(image);
    } else {
      content.append(document.createTextNode(match[0]));
    }
    lastIndex = match.index + match[0].length;
  }

  content.append(document.createTextNode(text.slice(lastIndex)));
}

function createPost(status) {
  const article = document.createElement("article");
  article.className = "mastodon-status";

  const timestamp = new Date(status.created_at);
  const postLink = document.createElement("a");
  const statusUrl = new URL(status.url);
  if (statusUrl.protocol !== "https:" || statusUrl.hostname !== "fedibird.com") {
    return null;
  }
  postLink.href = statusUrl.href;
  postLink.rel = "noopener noreferrer";
  postLink.target = "_blank";

  const time = document.createElement("time");
  time.dateTime = timestamp.toISOString();
  time.textContent = new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
  postLink.append(time);
  article.append(postLink);

  const content = document.createElement("p");
  content.className = "mastodon-status-content";
  appendPostContent(content, status);

  if (status.sensitive || status.spoiler_text) {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.className = "mastodon-cw";
    summary.textContent = status.spoiler_text || "センシティブな投稿を表示";
    details.append(summary, content);
    article.append(details);
  } else {
    article.append(content);
  }

  return article;
}

async function loadPosts() {
  if (!postsContainer) return;

  try {
    const response = await fetch(accountStatusesUrl, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("投稿を取得できませんでした");

    const statuses = await response.json();
    const posts = statuses
      .filter((status) => status.visibility === "public" && !status.reblog)
      .map(createPost)
      .filter(Boolean);

    postsContainer.replaceChildren();
    if (posts.length === 0) {
      postsContainer.textContent = "表示できる公開投稿はありません。";
      return;
    }
    postsContainer.append(...posts);
  } catch {
    postsContainer.textContent = "投稿を読み込めませんでした。";
  } finally {
    postsContainer.setAttribute("aria-busy", "false");
  }
}

loadPosts();