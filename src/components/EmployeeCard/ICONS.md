# Contact icons — attribution and colour rules

All six contact icons on `/about` come from **Font Awesome Free 7**, installed
from npm. This repo hosts no brand-owned artwork.

```
@fortawesome/free-solid-svg-icons    faEnvelope, faPhone
@fortawesome/free-brands-svg-icons   faGithub, faLinkedin, faBluesky, faMastodon
@fortawesome/react-fontawesome       <FontAwesomeIcon/>
@fortawesome/fontawesome-svg-core
```

## Attribution (required)

Font Awesome Free icons are licensed
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) by Fonticons, Inc. —
<https://fontawesome.com>. **That licence requires attribution, and this file
is it.** Keep it with the code. The packages themselves are
`(CC-BY-4.0 AND MIT)`: CC BY 4.0 covers the icons, MIT the code around them.

Font Awesome's own licence adds, of the brand glyphs among them:

> All brand icons are trademarks of their respective owners. The use of these
> trademarks does not indicate endorsement of the trademark holder by Font
> Awesome, nor vice versa. Please do not use brand logos for any purpose
> except to represent the company, product, or service to which they refer.

Linking to a person's profile on that service is exactly that use.

## Why every icon is black

Four of the six are trademarks, and each owner restricts the colours their
mark may take:

| Mark | Colours the owner permits |
| --- | --- |
| GitHub — <https://github.com/logos> | "should only appear in white, black, or in few cases grey or green" |
| LinkedIn — <https://brand.linkedin.com/in-logo> | "three color variations: blue, black, and white" |
| Bluesky — <https://bsky.social/about/support/branding> | official blue, black, white; "Recolor the logo (other than the approved black and white variants)" is a Don't |
| Mastodon — <https://joinmastodon.org/trademark> | "Do not change or modify the Mastodon marks" |

**Black is the only colour all four permit.** Cobalt, which this row used to
be, is permitted by none of them.

`mail` and `phone` are under no such constraint. They are black so the row
reads as one decision rather than two colours by accident.

The hover chip lifts to cobalt-100 rather than filling with cobalt, so the
marks stay legible without any of them having to change colour.

## Two notes for whoever touches this next

**Linking to a profile is the permitted use, and it is what we do.** Bluesky
states it outright — their
[Trademark Policy](https://bsky.social/about/support/trademarks) §4.1 permits
the butterfly as a social-media icon linking to a profile with no prior
approval. GitHub, LinkedIn and Mastodon have no equivalent named carve-out; we
rely on nominative use, which is the ordinary basis every site linking to a
social profile relies on.

**We deliberately do not host their logo files.** Earlier versions of this
component shipped Bluesky's and Mastodon's own SVGs from `static/img/social/`.
That was defensible, but taking all six from one npm package means we
redistribute nothing and have no provenance to defend. If you ever reintroduce
an official file — for fidelity, say — re-read each brand's policy first and
record the source here.
