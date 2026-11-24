# CurrencyLive

CurrencyLive is a lightweight, installable currency converter and gold tracker PWA built with HTML, CSS and vanilla JavaScript. It uses the [Frankfurter API](https://frankfurter.dev/) for currency reference rates and [Gold API](https://gold-api.com/docs) for live international XAU/USD spot prices.

## Features

- Latest available currency reference rates with source date
- Searchable API-supported currencies, swap, instant conversion and daily change
- 7-day, 30-day, 90-day and 1-year canvas charts
- Offline application shell and last-successful-rate cache
- Light/dark themes and install guidance
- Live international gold spot price with precisely converted INR estimates
- 24K, 22K and 18K rates by weight, plus GST/making-charge calculator
- Verified on-device gold history with transparent unavailable states
- Official IBJA benchmark link without scraping subscription-only data
- No accounts, analytics, backend, database or secrets

## Run locally

Service workers require HTTP rather than opening the file directly:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Data note

Frankfurter supplies daily reference rates, not tick-by-tick market forex quotes. Weekends and holidays may use the most recent published business-day rate. Gold INR values are converted international spot estimates, not IBJA benchmarks or local jewellery quotes.

## Hosting

Designed for GitHub Pages. Runtime cost: ₹0.
