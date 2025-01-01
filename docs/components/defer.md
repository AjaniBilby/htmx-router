# Defer Component

This component takes a deferral function and parameters and will lazily load it's content once mounted to the client page.
This can be useful for dynamic content on a relatively static page, such as a profile badge.

```jsx
<Defer loader={profile} params={{ someThingUniqueTo: "this placement" }}/>
```

!!! warning

    Don't forget to [register](../api/defer.md) your deferred function before use