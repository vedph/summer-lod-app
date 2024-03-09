# Summer LOD App

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.2.2.

## Docker

🐋 Quick Docker image build:

1. update version in `env.js` (and in Docker compose file), then `ng build`;
2. `docker build . -t vedph2020/summer-lod-app:0.0.1 -t vedph2020/summer-lod-app:latest` (replace with the current version).
3. push:

```bash
docker push vedph2020/summer-lod-app:0.0.1
docker push vedph2020/summer-lod-app:latest
```

## Overview

This toy application has been created for an imagined workflow where you start from a TEI text, have an XSLT transform it into HTML, and extract entities from it, enriching them with data from the LOD.

The UI provides:

- a code panel for XML.
- a code panel for XSLT.
- a toolbar allowing you to load/save files, prettify XML, transform XML, extract entities from XML.
- a list of extracted entities.
- the details about any of the extracted entities, as drawn from DBPedia/Wikidata.
- for places, their location on a map. The location too is derived from DBPedia/Wikidata.

## Notes

- ⚠️ until this is not fixed, if updating MapboxGL ensure to apply patch for this [MapboxGL issue](https://github.com/Wykks/ngx-mapbox-gl/issues/410)
- [DBPedia lookup](https://lookup.dbpedia.org/index.html)
- [WikiData lookup](https://query.wikidata.org/)

## Screenshot

![screenshot](shot.png)
