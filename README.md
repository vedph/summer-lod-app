# Summer LOD App

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.2.2.

## Docker

🐋 Quick Docker image build:

1. update version in `env.js` (and in Docker compose file), then `ng build --configuration=production`;
2. `docker build . -t vedph2020/summer-lod-app:0.0.9 -t vedph2020/summer-lod-app:latest` (replace with the current version).
3. push:

```bash
docker push vedph2020/summer-lod-app:0.0.9
docker push vedph2020/summer-lod-app:latest
```

🚀 Production version for temporary host environment:

1. `ng build --configuration=production`.

2. in dist `env.js`:

     - change the API URL from `window.__env.apiUrl = "http://localhost:5275/";` to `window.__env.apiUrl = "https://summer-lod-api.fusi-soft.com/";`.
     - set `window.__env.https = true;` instead of false. This will make the geo service use HTTPS rather than HTTP when querying DBPedia, thus avoiding mixed content issues from a HTTPS production environment.

3. `docker build . -t vedph2020/summer-lod-app-prod:0.0.9`.

4. `docker push vedph2020/summer-lod-app-prod:0.0.9`.

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

A [backend API](https://github.com/vedph/summer-lod-api) provides these endpoints:

- POST xml/rendition
- POST xml/entities
- POST xml/prettify
- POST xml/uglify
- GET proxy

The toy app has a single page (essentially the home page component) with these main areas:

- an XML code editor (Monaco-based). At startup this loads a default document using the [AssetService](/src/services/asset.service.ts).
- an XSLT code editor (Monaco-based). At startup this loads a default document as above.
- the HTML rendition of XML via XSLT.
- a list of LOD entities as extracted from XML.

A toolbar allows to:

- load XML from file.
- save XML to file.
- prettify XML code.
- load XSLT from file.
- save XSLT to file.
- prettify XSLT code. This is done by the backend which receives an XML code to prettify or uglify.
- transform XML using XSLT: this is done by the backend which receives both XML and XSLT code.
- parse LOD entities from XML. The backend entities parser is very raw, and just scans each TEI `person`, `org` or `place` element descending from the root TEI element, assuming that:
  - name(s) are in its children elements `persName`, `orgName`, `placeName`, respectively.
  - identifier(s) are in its children elements `idno`.
  - link(s) are in its children elements `link`.

Once entities have been parsed, the [entities list component](./src/app/components/entity-list/entity-list.component.ts) receives them and manages their display. At this time, places are no different from all the other entities: they just have labels, IDs, and links, and no more.

As here we need position, to demonstrate that the backend has no georeferenced data and everything comes from a LOD service here the [GeoService](./src/app/services/geo.service.ts) is used to supply coordinates for each entity classified as a place.

If the user selects an entity which is either a place or a person, the entity list component uses a corresponding DBPedia service to retrieve and display more data about it. As querying takes a lot of time, the DBPedia service caches its result and reuses it whenever possible.

### LOD Services

The public **DBPedia** service is accessed by services which build a SPARQL query with the received parameters (open the browser developer console - F12 in most systems - to look at the generated SPARQL):

- [DbpediaPersonService](./src/services/dbpedia-person.service.ts) for persons.
- [DbpediaPlaceService](./src/services/dbpedia-place.service.ts) for places.
- [DbpediaSparqlService](./src/services/dbpedia-sparql.service.ts) is used to parse the received results.

Additionally, a [GeoService](./src/app/services/geo.service.ts) is used to find coordinates for place entities, drawing data from DBPedia or Wikipedia according to the entity ID:

- if the ID starts with `http://dbpedia.org/resource/`, we look into DBPedia.
- if the ID starts with `Q`, we look into Wikidata.

This of course assumes that our place entities use one of the two providers, which is fine for the sake of this toy app. As querying these public services takes a lot of time, the geo service caches its result and reuses it whenever possible.

## History

### 0.0.9

- 2024-07-02:
  - fixed alt image value in person info.
  - added conditional HTTPS for geo service.

### 0.0.8

- 2024-06-29:
  - updated Angular and packages.
  - updated sample XML.
  - added image rendition to XSLT.
  - added WHG in lookup configuration.
- 2024-06-19: updated sample XML (thanks Paolo!).

### 0.0.7

- 2024-06-18:
  - do not assume that 1st ID in entity is DBPedia.
  - fixed single entity link not clickable in entities list.

### 0.0.6

- 2024-06-18:
  - updated Angular.
  - limited DBPedia to 2 languages to optimize performance avoiding Cartesian results with many languages.
  - new samples from Klee.

### 0.0.5

- 2024-06-10:
  - updated Angular and packages.
  - added `class="mat-X"` for each `color="X"` (e.g. `class="mat-primary"` wherever there is a `color="primary"`) to allow transitioning to Angular Material M3 from M2. This also implies adding it directly to the target element, so in the case of `mat-icon` inside a `button` with `color` the class is added to `mat-icon` directly (unless the button too has the same color). This allows to keep the old M2 clients while using the new M3, because it seems that the compatibility mixin is not effective in some cases like inheritance of `color`, and in the future `color` will be replaced by `class` altogether.
  - applied [M3 theme](https://material.angular.io/guide/theming).

### 0.0.4

- 2024-05-24: updated Angular and packages.
