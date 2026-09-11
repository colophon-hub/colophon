import { Link } from 'react-router-dom'
import { resolveFeaturedTitleDisplay } from '../lib/featuredTitleDisplay'

function formatDate(value) {
  const d = new Date(value || '')
  if (!Number.isFinite(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export function HomeFeedCard({ item, variant = 'recent' }) {
  const isHero = variant === 'hero'
  const hasImage = Boolean(item?.imageUrl)
  const mode = hasImage ? resolveFeaturedTitleDisplay(item) : 'below'
  const Heading = isHero ? 'h1' : 'h2'
  const published = formatDate(item?.publishedAt || item?.updatedAt)
  const classes = [
    'home-feed-card',
    `home-feed-card--${isHero ? 'hero' : 'recent'}`,
    `home-feed-card--${mode}`,
    hasImage ? 'home-feed-card--has-image' : 'home-feed-card--no-image',
  ].join(' ')

  if (mode === 'hidden' && hasImage) {
    return (
      <article className={`h-entry ${classes}`} data-home-card-mode="hidden">
        <Link className="u-url home-feed-card__link home-feed-card__link--image-only" to={item.href}>
          <div className="home-feed-card__media home-feed-card__media--image-only">
            <img className="u-photo u-featured home-feed-card__actual-image" src={item.imageUrl} alt="" />
          </div>
          <Heading className="p-name screen-reader-only">{item.title}</Heading>
        </Link>
      </article>
    )
  }

  if (mode === 'overlay' && hasImage) {
    return (
      <article className={`h-entry ${classes}`} data-home-card-mode="overlay">
        <Link className="u-url home-feed-card__link" to={item.href}>
          <div
            className="home-feed-card__media home-feed-card__media--backdrop"
            aria-hidden="true"
            style={{ backgroundImage: `url("${item.imageUrl}")` }}
          />
          <img className="u-photo u-featured screen-reader-only" src={item.imageUrl} alt="" />
          <div className="home-feed-card__overlay-flow">
            <CardMeta item={item} published={published} isHero={isHero} />
            <Heading className="p-name home-feed-card__title">{item.title}</Heading>
          </div>
        </Link>
      </article>
    )
  }

  return (
    <article className={`h-entry ${classes}`} data-home-card-mode="below">
      {hasImage ? (
        <Link className="home-feed-card__media-link" to={item.href} aria-label={item.title}>
          <img className="u-photo u-featured home-feed-card__actual-image" src={item.imageUrl} alt="" />
        </Link>
      ) : null}
      <div className="home-feed-card__below-copy">
        <CardMeta item={item} published={published} isHero={isHero} />
        <Heading className="p-name home-feed-card__title">
          <Link className="u-url" to={item.href}>{item.title}</Link>
        </Heading>
      </div>
    </article>
  )
}

function CardMeta({ item, published, isHero }) {
  return (
    <div className="home-feed-card__meta">
      {published ? <time className="dt-published" dateTime={item?.publishedAt || item?.updatedAt || published}>{published}</time> : null}
      {item?.target ? <span>{item.target}</span> : null}
      {isHero && item?.contentType ? <span>{item.contentType}</span> : null}
    </div>
  )
}
