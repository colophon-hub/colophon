import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  DEFAULT_PUBLIC_NAVIGATION_ITEMS,
  makeCustomNavigationItem,
  normalizePublicNavigation,
  resolveVisibleNavigation,
} from '../shared/publicNavigationModel.js'

const topbar = fs.readFileSync(new URL('../src/components/PublicationTopbar.jsx', import.meta.url), 'utf8')
const settings = fs.readFileSync(new URL('../src/components/AdminPublicConfigCard.jsx', import.meta.url), 'utf8')
const settingsCss = fs.readFileSync(new URL('../src/admin-public-config.css', import.meta.url), 'utf8')
const modules = fs.readFileSync(new URL('../src/lib/publishingModules.js', import.meta.url), 'utf8')
const adminRail = fs.readFileSync(new URL('../src/components/AdminRail.jsx', import.meta.url), 'utf8')
const investigationBoundary = fs.readFileSync(new URL('../src/components/InvestigationRouteBoundary.jsx', import.meta.url), 'utf8')
const campaigns = fs.readFileSync(new URL('../src/components/CampaignsIndexPage.jsx', import.meta.url), 'utf8')
const feedSettings = fs.readFileSync(new URL('../src/lib/feedSettings.js', import.meta.url), 'utf8')

test('simple blog navigation does not advertise optional campaign or investigation modules', () => {
  const visible = resolveVisibleNavigation({ items: DEFAULT_PUBLIC_NAVIGATION_ITEMS }, ['articles'])
  assert.deepEqual(visible.map((item) => item.id), ['archive', 'feeds', 'about'])
})

test('optional public links appear only when their modules are enabled', () => {
  const visible = resolveVisibleNavigation({ items: DEFAULT_PUBLIC_NAVIGATION_ITEMS }, ['articles', 'campaigns', 'investigations'])
  assert.deepEqual(visible.map((item) => item.id), ['archive', 'feeds', 'about', 'investigations', 'campaigns'])
})

test('publication navigation supports custom links and rejects unsafe destinations', () => {
  const custom = makeCustomNavigationItem(DEFAULT_PUBLIC_NAVIGATION_ITEMS)
  const navigation = normalizePublicNavigation({ items: [
    ...DEFAULT_PUBLIC_NAVIGATION_ITEMS,
    { ...custom, label: 'Library', href: 'https://example.org/library' },
    { id: 'bad', label: 'Bad', href: 'javascript:alert(1)' },
  ] })
  assert.ok(navigation.items.some((item) => item.label === 'Library'))
  assert.ok(!navigation.items.some((item) => item.id === 'bad'))
})

test('masthead renders the saved navigation model instead of hardcoded feature links', () => {
  assert.match(topbar, /resolveVisibleNavigation/)
  assert.match(topbar, /navItems\.map/)
  assert.doesNotMatch(topbar, /nav\.investigations\.label/)
  assert.doesNotMatch(topbar, /nav\.campaigns\.label/)
})

test('settings can show hide rename reorder remove and add public links', () => {
  for (const phrase of ['Primary navigation', 'Add navigation link', 'Move', 'Destination', 'Hidden because']) assert.match(settings, new RegExp(phrase, 'i'))
  assert.match(settings, /updateNavigation/)
})

test('settings do not display navigation rows for disabled publishing modules', () => {
  assert.match(settingsCss, /public-navigation-editor__row:has\(\.public-navigation-editor__module\.is-disabled\)/)
  assert.match(settingsCss, /display:\s*none/)
})

test('investigations are a real optional module in both public and admin surfaces', () => {
  assert.match(modules, /id: 'investigations'/)
  assert.match(adminRail, /module: 'investigations'/)
  assert.match(investigationBoundary, /PublishingModuleGate moduleId="investigations"/)
})

test('generic campaign and feed defaults do not inherit a Colophon publication identity', () => {
  assert.doesNotMatch(campaigns, /colophon MEDIA/)
  assert.doesNotMatch(campaigns, /example\.invalid/)
  assert.doesNotMatch(feedSettings, /Colophon Collective/)
  assert.doesNotMatch(feedSettings, /Follow the Colophon archive/)
})
