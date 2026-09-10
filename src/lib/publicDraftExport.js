import { PUBLIC_CONFIG_SCHEMA_VERSION } from './publicConfigSchema'

export function buildPublicConfigPayload(input) {
  const publicSite = {
    version: PUBLIC_CONFIG_SCHEMA_VERSION,
    identity: input?.identity || {},
    appearance: input?.appearance || {},
    navigation: input?.navigation || {},
    text: input?.text || {},
    styles: input?.styles || {},
    blocks: input?.blocks || {},
  }
  return { version: PUBLIC_CONFIG_SCHEMA_VERSION, updatedAt: new Date().toISOString(), ...publicSite, publicSite }
}

export function buildChangedOnlyPayload(input) {
  const publicSite = {
    version: PUBLIC_CONFIG_SCHEMA_VERSION,
    identity: input?.identity || {},
    appearance: input?.appearance || {},
    navigation: input?.navigation || {},
    text: input?.text || {},
    styles: input?.styles || {},
    blocks: input?.blocks || {},
  }
  return { version: PUBLIC_CONFIG_SCHEMA_VERSION, updatedAt: new Date().toISOString(), changedOnly: true, ...publicSite, publicSite }
}
