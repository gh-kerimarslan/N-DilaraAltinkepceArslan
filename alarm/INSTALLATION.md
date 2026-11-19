# ALARM — seven-screen installation / 2076

Reach the installation from Artworks → New Media → Open the ALARM installation.

| Screen | Page | Purpose |
|---|---|---|
| 01 | moloch.html | Drought / tail |
| 02 | cheetah.html | Rapid consumption / body |
| 03 | cockroach.html | Radiation / wings |
| 04 | raven.html | Knowledge / head |
| 05 | gorilla.html | Human values / eyes |
| 06 | griffin.html | Main 3D sculpture, orbit and original synthesized ambience |
| 07 | history.html | Portrait museum register with a slow scroll |

The main 3D form is the artist's original ALARM ANIMATION.fbx, fetched selectively from the provided Drive folder. Blender 4.3.2 reduced the mesh to roughly one third of its original geometry and exported a web GLB with its original rig and all sixteen animation clips. gltfpack 1.3.0 quantized the geometry and resampled the animations at 24 Hz, reducing the final model to approximately 3.6 MB. The source FBX and Blender files remain unchanged in Drive. Only the IDLE clip is played. The fifteen three-level reactions are preserved in the GLB but are not yet connected to data thresholds. The environment, material study and synthesized ambience are new browser-based additions. Tablet animals remain the supplied still illustrations with subtle whole-image motion; anatomical tablet animation remains a separate step.

Only the main screen produces audio, after pressing the sound button. It begins muted and fades up slowly. Set the TV/browser output low for installation calibration. Audio pauses on background tabs. Touch/mouse controls provide orbit and zoom; the initial angle button restores the three-quarter composition. Fullscreen/wake lock depend on browser/device support. Test the actual Samsung tablets, TV resolution, orientation, long-running stability, power settings and audio output before exhibition.

## Public observations

`scripts/collect_public_feeds.py` fetches bounded source records without paid APIs or an LLM. The `Collect public ALARM observations` workflow runs at minutes 07, 27 and 47. GitHub schedules may be delayed; this is not a hard real-time scheduler. Only a small JSON document is written to an independent `alarm-data` branch. It does not publish photographs or rebuild the website on each collection. The website reads that JSON every twenty minutes and has an explicitly identified saved snapshot fallback.

The initial scopes are research selections, visible on each tablet: Istanbul modeled soil moisture, German electricity load, a Safecast sensor sample, English Wikipedia editing sample tempo, and GDELT event-code counts. These are not global crisis scores. They must be reviewed artistically before enabling thresholds. Numeric values do not trigger alarms in this version. Missing/invalid/future data are unknown, old data are stale. No value is silently treated as safe. Source notes flow slowly but do not claim new measurements. Contributor usernames/IPs, full news text and secrets are not republished.

`data/sources.json` is the source and attribution catalog. Open-Meteo and Energy-Charts require attribution; Safecast data are CC0; Wikimedia/GDELT outputs used here are bounded metadata and counts. Scope, method and source links stay visible. The event collector counts GDELT root codes 19 and 20 in the latest export; it does not count unique incidents, people or values. Wikipedia sample tempo measures neither truth nor misinformation. Safecast units remain source-specific; CPM is not converted to dose.

## History / image attribution

The Met collection API confirmed `isPublicDomain: true` for both downloaded photographs:

- Gold rosette with the head of a griffin, Greek, Rhodian?, ca. 630–620 BCE. Accession 12.229.24. https://www.metmuseum.org/art/collection/search/248696
- Plaque with horned lion-griffins, Achaemenid, ca. 6th–4th century BCE. Accession 54.3.2. https://www.metmuseum.org/art/collection/search/324290

Both are reproduced under the Met Open Access/CC0 policy; dates, culture, uncertainty and attribution are retained. Historical interpretation also refers to Anatoly Grablevsky, “Gold, Griffins, and Greeks: Scythian Art and Cultural Interactions in the Black Sea,” The Met, 2024: https://www.metmuseum.org/essays/scythian-art

ALARM imagery belongs to the artist's existing archive. The 2076 register entry is explicitly labeled artistic fiction, not a historical provenance claim. Scroll can be paused or read manually and respects reduced-motion preferences.

## Software

Three.js 0.187.0, OrbitControls, GLTFLoader, BufferGeometryUtils, SkeletonUtils and RoomEnvironment are vendored locally from the official npm package. MIT license: `assets/vendor/THREE-LICENSE.txt`. Core/module bundles were minified with Terser 5.44.1. No CDN, third-party embed, tracking or remotely executing script is required for the installation screens. Existing site CSP is retained and only the public raw GitHub data origin is allowed for feed requests.
