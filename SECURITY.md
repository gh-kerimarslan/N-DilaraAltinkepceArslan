# Security scope

This revision hardens the static portfolio and supplies a read-only ALARM service. It does not constitute a guarantee of complete security or an account/production penetration test.

## Applied controls

- No runtime framework, package manager or browser dependency for the static site.
- Self-hosted fonts and images; no third-party font CDN.
- No executable inline scripts or event handlers. CSP restricts script sources, objects, frames, base URLs and forms. Existing inline presentation styles require `style-src 'unsafe-inline'`.
- Optional analytics is off until chosen; advertising features are disabled.
- External tabs use `noopener noreferrer`. External data is rendered with `textContent`.
- The ALARM API exposes no write, refresh, account, upload or arbitrary URL-fetch endpoint.
- Feed URLs come only from private owner configuration. HTTPS, explicit host allowlists, public-address checks, no redirects, bounded JSON responses and timeouts reduce source-fetch risk. Provider adapters still require source-specific validation.
- Non-finite values, invalid timestamps, invalid thresholds and failed sources cannot produce a normal state. Unknown and stale are explicit.
- The Cloud Run container runs without root and uses a pinned production HTTP server. Keep the base image and dependency pin updated.

## Hosting controls still required

Enforce HTTPS and verify the custom domain in GitHub. Protect the publishing branch, use account MFA, keep write credentials out of the repository and enable secret scanning. Use a least-privilege Cloud Run service account. Keep any provider credentials in Secret Manager. Apply public endpoint rate limits, Cloud quotas, cost alerts and log retention suitable for the installation.

`frame-ancestors`, HSTS and `X-Content-Type-Options` require actual HTTP response headers. GitHub Pages does not apply an `_headers` file. Meta tags do not replace those controls. Use a host/CDN with response-header support if these controls are required. Do not add a restrictive frame policy to a preview environment without checking its required embedding.

The API CORS allowlist is not authentication. Only intentionally public, non-personal artwork signals may be returned. There are no administrative controls in the public website.

## Reporting

Report suspected problems privately to `info@dilaraaltinkepcearslan.com`. Do not post credentials, private configuration or exploit details in a public issue.
