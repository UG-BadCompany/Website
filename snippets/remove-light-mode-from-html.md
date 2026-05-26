# Remove Light Mode From HTML

In these files, remove this nav button everywhere it appears:

```html
<button class="theme-toggle" type="button" data-theme-toggle>Light Mode</button>
```

Likely files:
- public/index.html
- public/login/index.html
- public/dashboard/index.html
- public/admin/index.html
- public/admin/ai-quotes/index.html
- public/thank-you/index.html

If you use the replacement `public/js/site.js` in this hotfix, it will also remove any leftover light mode button automatically.
