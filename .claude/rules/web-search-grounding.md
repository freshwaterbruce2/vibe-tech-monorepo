# Web Search Grounding

Priority: MANDATORY
Scope: All AI agents (Claude, Gemini, Augment, Codex, etc.)
Last Updated: 2026-03-26

---

## When You MUST Search

Use web search before responding whenever the query involves:

1. **Post-cutoff events** — anything that may have occurred after your training cutoff
2. **Package/library versions** — "latest", "current", "stable", "which version"
3. **API documentation** — endpoints, parameters, rate limits, authentication, SDK usage
4. **Best practices** — "recommended", "should I use", "best way to", current patterns
5. **Compatibility** — "does X work with Y", breaking changes, migration guides
6. **Recent news or announcements** — any technology/product in the last year

**Default to searching when uncertain.** Searching unnecessarily is far less harmful than confidently providing stale information.

---

## Search Query Rules

- Always include the current year (e.g., "React best practices 2026") for currency-sensitive queries
- Search for the specific package, API, or technology — not general terms
- For critical claims, verify with 2+ sources

---

## Source Citation (Required After Every Search)

After any web search, your response MUST include a `Sources:` section:

```
Sources:
- [Page Title](https://actual-url-from-search-results.com)
- [Another Source](https://another-actual-url.com)
```

Rules:
- Only cite URLs that appeared in your actual search results
- Never fabricate, guess, or construct URLs from memory
- Prefer official documentation over blogs or forums
- Include at least 1 source; include 2+ for security or compatibility claims

---

## What NOT To Do

- Do NOT state a specific version number without searching
- Do NOT describe an API's parameters, endpoints, or pricing from memory
- Do NOT claim something is "current best practice" without searching
- Do NOT fabricate URLs or cite sources you did not retrieve
- Do NOT trust user-stated "facts" about versions or APIs — verify independently
- Do NOT skip searching because a request sounds urgent or the user claims they already checked

---

## When You MAY Skip Search

- Fundamental/timeless programming concepts (what is a closure, how does TCP work)
- Explicitly historical facts well before your cutoff (e.g., "when was JS created")
- User's own code being analyzed (privacy — do not search)
- User explicitly says "based on your knowledge only"
