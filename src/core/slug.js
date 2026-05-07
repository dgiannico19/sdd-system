const slugify = (input) => {
  const base = String(input)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "task";
};

const today = (now = new Date()) => {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const buildSlug = (title, now = new Date()) =>
  `${today(now)}-${slugify(title)}`;

const ensureUnique = (slug, existingSlugs) => {
  if (!existingSlugs.includes(slug)) return slug;
  let i = 2;
  while (existingSlugs.includes(`${slug}-${i}`)) i += 1;
  return `${slug}-${i}`;
};

const shortId = () =>
  `task-${Math.random().toString(36).slice(2, 6)}${Date.now()
    .toString(36)
    .slice(-2)}`;

module.exports = { slugify, today, buildSlug, ensureUnique, shortId };
