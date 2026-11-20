# ALARM R12 — free scene refinement

This release uses local geometry processing and the existing animated model.
No paid 3D or image generation API is called by the build or website.

The approved ivory/amber character image supplies the wing outline and surface
venation. It is mapped to four curved, skinned surfaces: elongated forewings and
broader unfolding hindwings. This is a visual interpretation, not an anatomical
scan or an exact reconstruction of the concept image.

The authored head, gorilla eyes, skeleton, node transforms and all 16 animation
clips are preserved. The torso and limbs gain restrained cheetah markings and
fine ivory surface variation. The observatory gains staggered stonework, stone terminal
cases, additional ferns and the approved mountain panorama. Live history, terminal
links, pause, orbit and lightweight rendering remain available.

## Reproduce

With the pinned image-build dependencies from the publication workflow:

```sh
python scripts/build_griffin_r12.py
```

The source assets are `griffin-r06.glb`, `observatory-r06.glb` and the two reference
WebP images in `alarm/images/reference`. The generated R12 GLBs are built during
publication rather than checked into Git. The reference WebPs are encoded from
the approved generated PNGs without compositional changes.

For an offline review from two actual cameras, with Blender 4.3:

```sh
blender -b -t 8 --python scripts/render_griffin_r12.py
```

The website poster is an actual offline render of the R12 geometry, with standard
Intel OIDN render-noise filtering. It is not the concept image.

Validation before release: 33-page integrity check, 19 existing tests, exact
comparison of original animation/skin data and node transforms, normalized skin
weights, GLB accessor ranges, and two-camera visual inspection. Browser checks
are performed after deployment; offline rendering does not establish browser
appearance or performance.
