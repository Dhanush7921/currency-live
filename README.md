# CurrencyLive

CurrencyLive is a lightweight, installable currency converter PWA built with HTML, CSS and vanilla JavaScript. It uses the [Frankfurter API](https://frankfurter.dev/) for latest available daily reference rates and historical data.

## Features

- Latest available currency reference rates with source date
- Searchable API-supported currencies, swap, instant conversion and daily change
- 7-day, 30-day, 90-day and 1-year canvas charts
- Offline application shell and last-successful-rate cache
- Light/dark themes and install guidance
- No accounts, analytics, backend, database or secrets

## Run locally

Service workers require HTTP rather than opening the file directly:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Data note

Frankfurter supplies daily reference rates, not tick-by-tick market forex quotes. Weekends and holidays may use the most recent published business-day rate.

## Hosting

Designed for GitHub Pages. Runtime cost: ₹0.
