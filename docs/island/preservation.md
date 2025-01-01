# Island Perseveration

But how to I stop my defer from reloading, and my client island from remounting each time I use [htmx boost](https://htmx.org/attributes/hx-boost/), or re-render a partial using a htmx fetcher?

Just wrap it in a [hx-preserve](https://htmx.org/attributes/hx-preserve/)
```jsx
<div id="profile" hx-preserve="true">
  <Defer loader={profile}>
    A skeleton I could define
  </Defer>
</div>
```