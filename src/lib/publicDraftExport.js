import { PUBLIC_CONFIG_SCHEMA_VERSION } from './publicConfigSchema'
function publicSiteShape(input){return{version:PUBLIC_CONFIG_SCHEMA_VERSION,identity:input?.identity||{},indieweb:input?.indieweb||{},themes:input?.themes||{},appearance:input?.appearance||{},navigation:input?.navigation||{},text:input?.text||{},styles:input?.styles||{},blocks:input?.blocks||{}}}
export function buildPublicConfigPayload(input){const publicSite=publicSiteShape(input);return{version:PUBLIC_CONFIG_SCHEMA_VERSION,updatedAt:new Date().toISOString(),...publicSite,publicSite}}
export function buildChangedOnlyPayload(input){const publicSite=publicSiteShape(input);return{version:PUBLIC_CONFIG_SCHEMA_VERSION,updatedAt:new Date().toISOString(),changedOnly:true,...publicSite,publicSite}}
