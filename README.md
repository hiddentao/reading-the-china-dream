# reading-the-china-dream

[Reading The China Dream](https://www.readingthechinadream.com/) static site powered by [Gatsby](https://gatsbyjs.com).

Live preview: 

## Developer guide
 
To install dependencies:

```bash
bun install
```

To start a development server:

```bash
bun run dev
```

To build for production:

```bash
bun run build
```

To run for production:

```bash
bun run serve
```

JavaScript runtime.

## Scraping original site

You can scrape the [origin website](https://www.readingthechinadream.com/) using:

```bash
bun run scripts/scrape.ts
```

This will incrementally update the scraped data in `data/` with anything new. To force a fresh scrape from scratch:

```bash
bun run scripts/scrape.ts --force
```


