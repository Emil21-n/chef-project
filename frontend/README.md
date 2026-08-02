# Chef's Choice frontend

The page is rendered from Strapi data on the server.

Create `frontend/.env.local` for local development:

```env
NEXT_PUBLIC_STRAPI_API_URL=https://your-strapi-instance.example.com
STRAPI_API_TOKEN=your_remote_strapi_api_token
```

For production deployments, set the same server-side variables in the hosting
dashboard. `frontend/.env.local` is intentionally ignored by git and is not
deployed.

```env
NEXT_PUBLIC_STRAPI_API_URL=https://your-strapi-instance.example.com
STRAPI_API_TOKEN=your_remote_strapi_api_token
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-mailbox@yandex.ru
SMTP_PASSWORD=your_yandex_app_password
ORDER_NOTIFICATION_EMAIL=orders@example.com
```

Use a custom least-privilege Strapi token with `find` for Product,
Menu-section, Hero-slide, Contact-info, and Site-setting, plus `find`, `create`,
and `update` for Order. Do not grant public access to Order because it contains
customer data.

If order creation works but the manager email is not delivered, check the
server logs for `Unable to send paid order notification email`. The log prints a
sanitized SMTP error, for example missing environment variables, auth failure,
or network timeout.
