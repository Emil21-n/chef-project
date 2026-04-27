# Chef's Choice frontend

The page is rendered from Strapi data on the server.

Create `frontend/.env.local` for local development:

```env
STRAPI_URL=https://sublime-delight-1a4de16cb4.strapiapp.com
STRAPI_API_TOKEN=your_read_only_content_api_token
```

If the Strapi content API is public, `STRAPI_API_TOKEN` can be left empty.
