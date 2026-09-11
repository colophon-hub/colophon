# Colophon extension hooks

Colophon exposes a deliberately small, versioned extension boundary for trusted integrations. This is **not** an arbitrary uploaded-plugin system.

The current extension API version is `1.0.0`.

Trusted extension modules are included by an operator/developer at build time. A remote editor cannot upload JavaScript and cause the server to execute it.

## Registering an extension

```js
import { createExtensionApi } from '../shared/extensionHooks.js'

const api = createExtensionApi({
  id: 'my-extension',
  name: 'My extension',
  version: '1.0.0',
  apiVersion: '1.0.0'
})

api.on('content:afterSave', ({ item }) => {
  console.log(item.id)
})
```

`src/extensions/example-reading-time.js` is a harmless example and is not enabled by default.

## Events currently wired by core

### `content:beforeSave`

Runs immediately before a native-content save request. Payload:

```js
{
  item: { /* cloned normalized native content */ },
  revisionNote: "save"
}
```

### `content:afterSave`

Runs after confirmed persistence with the saved item and revision note.

### `content:beforePublish`

Runs before a save whose resulting status is `published`.

### `content:afterPublish`

Runs after a published save is confirmed.

### `theme:activated`

Runs when a site manager selects a theme in the settings draft:

```js
{
  themeId: "paper",
  previousThemeId: "neutral"
}
```

## Filters currently wired by core

### `publicNavigation`

Receives the resolved public-navigation array and may return a replacement array before the top navigation is rendered.

The hook library also provides generic asynchronous and synchronous filter machinery for future documented filters. A filter name is not a stable public API until it is listed here and actually consumed by core.

## Failure isolation

Each handler/filter executes inside its own error boundary. If one extension throws, Colophon records/logs the failure and continues to the next extension rather than taking down the publication because one integration failed.

Payloads are cloned before they reach extensions to reduce accidental mutation of core state.

## Secrets

Hook payloads must contain only the data required by the documented event/filter. Password hashes, session keys, TOTP secrets, recovery-code hashes, storage credentials, and deployment secrets must never be exposed to extensions.

## Compatibility

Extensions must declare the supported `apiVersion`. Colophon does not promise compatibility for private modules, undocumented hooks, React internals, or database implementation details.
