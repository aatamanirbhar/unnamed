const GLOBAL_VISITOR_KEY = "omenly.visitor";

export function getGlobalVisitorKey() {
  let key = window.localStorage.getItem(GLOBAL_VISITOR_KEY);

  if (!key) {
    key = crypto.randomUUID();
    window.localStorage.setItem(GLOBAL_VISITOR_KEY, key);
  }

  return key;
}

export function getVisitorKeyForSlug(slug: string) {
  const storageKey = `omenly.sign.${slug}.visitor`;
  let key = window.localStorage.getItem(storageKey);

  if (!key) {
    key = `${getGlobalVisitorKey()}:${slug}`;
    window.localStorage.setItem(storageKey, key);
  }

  return key;
}
