# Summer LOD App

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.2.2.

## Docker

🐋 Quick Docker image build:

1. update version in `env.js` (and in Docker compose file), then `ng build`;
2. `docker build . -t vedph2020/summer-lod-app:0.0.2 -t vedph2020/summer-lod-app:latest` (replace with the current version).
3. push:

```bash
docker push vedph2020/summer-lod-app:0.0.2
docker push vedph2020/summer-lod-app:latest
```

## Overview

This toy application has been created for a workflow like this:

1. start from a TEI text.
2. add an XSLT transformation to render TEI into HTML.
3. extract entities from TEI, enriching them with data from the LOD.

This workflow can be useful to show how all these technologies work together in a real-world scenario, even though the toy application is minimalist and so are the sample documents handled by it.

The UI relies on a [backend API](https://github.com/vedph/summer-lod-api) for processing XML, and provides:

- a code panel for XML.
- a code panel for XSLT.
- a toolbar allowing you to load/save files, prettify XML, transform XML, extract entities from XML.
- a list of extracted entities.
- the details about any of the extracted entities, as drawn from DBPedia/Wikidata.
- for places, their location on a map. The location too is derived from DBPedia/Wikidata.

## Notes

- ⚠️ Before switching to Leaflet, updating MapboxGL required to apply patch for this [MapboxGL issue](https://github.com/Wykks/ngx-mapbox-gl/issues/410)
- [DBPedia lookup](https://lookup.dbpedia.org/index.html)
- [WikiData lookup](https://query.wikidata.org/)

## Screenshot

This screenshot was taken from the current alpha version of the app:

![screenshot](shot.png)

## Technical Overview

The toy app has a single page with these main areas:

- an XML code editor (Monaco-based). At startup this loads a default document.
- an XSLT code editor (Monaco-based). At startup this loads a default document.
- the HTML rendition of XML via XSLT.
- a list of LOD entities as extracted from XML.

A toolbar allows to:

- load XML
- save XML
- prettify XML code
- load XSLT
- save XSLT
- prettify XSLT code
- transform XML using XSLT
- parse LOD entities from XML

## History

- 2024-06-10:
  - updated Angular and packages.
  - added `class="mat-X"` for each `color="X"` (e.g. `class="mat-primary"` wherever there is a `color="primary"`) to allow transitioning to Angular Material M3 from M2. This also implies adding it directly to the target element, so in the case of `mat-icon` inside a `button` with `color` the class is added to `mat-icon` directly (unless the button too has the same color). This allows to keep the old M2 clients while using the new M3, because it seems that the compatibility mixin is not effective in some cases like inheritance of `color`, and in the future `color` will be replaced by `class` altogether.
  - applied [M3 theme](https://material.angular.io/guide/theming).
- 2024-05-24: updated Angular and packages.
