import type { Champion, LocationGroup } from "./champions"

/** Escapes a string for safe interpolation into raw HTML. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Pixel size of a location pin based on how many champions it rolls up. */
export function pinSize(count: number): number {
  return count > 9 ? 44 : count > 4 ? 38 : 32
}

/**
 * Avatar markup for a champion. The initial is always rendered as a base
 * layer; the locally-hosted avatar sits on top and hides itself if it fails
 * to load, revealing the initial underneath.
 */
export function championAvatarHtml(champ: Champion): string {
  const initial = escapeHtml(champ.name.charAt(0).toUpperCase())
  const img = champ.avatar
    ? `<img src="${escapeHtml(champ.avatar)}" alt="" class="champion-popup__avatar-img" loading="lazy" onerror="this.style.display='none'" />`
    : ""
  return `<span class="champion-popup__avatar">
                <span class="champion-popup__avatar-initial">${initial}</span>
                ${img}
              </span>`
}

/** A single champion `<li>` inside a location popup. */
export function championListItemHtml(champ: Champion): string {
  const name = champ.user_link
    ? `<a href="${escapeHtml(champ.user_link)}" target="_blank" rel="noreferrer">${escapeHtml(champ.name)}</a>`
    : escapeHtml(champ.name)
  const meta = [champ.ext_role, champ.company]
    .filter(Boolean)
    .map((s) => escapeHtml(s as string))
    .join(" · ")
  return `<li class="champion-popup__item">
              ${championAvatarHtml(champ)}
              <span class="champion-popup__text">
                <span class="champion-popup__name">${name}</span>
                ${meta ? `<span class="champion-popup__meta">${meta}</span>` : ""}
              </span>
            </li>`
}

/** Full popup markup for a location group. */
export function buildPopupHtml(group: LocationGroup): string {
  const count = group.champions.length
  const listItems = group.champions.map(championListItemHtml).join("")
  return `<div class="champion-popup">
          <div class="champion-popup__header">
            <span class="champion-popup__location">${escapeHtml(group.location)}</span>
            <span class="champion-popup__count">${count} champion${count === 1 ? "" : "s"}</span>
          </div>
          <ul class="champion-popup__list">${listItems}</ul>
        </div>`
}
