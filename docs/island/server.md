# Server Island

To create a server island simply use the [`<Defer/>`](../components/defer.md) to lazily load a html partial once the page is mounted. You can optionally define a skeleton which will be replaced once the deferred component has been loaded.

This can be useful for mostly static pages allowing them to be cached and only the dynamic content is generated later after the browser has loaded the cached page from a CDN.

```jsx
<Defer loader={profile}>
  A skeleton I could define
</Defer>
```