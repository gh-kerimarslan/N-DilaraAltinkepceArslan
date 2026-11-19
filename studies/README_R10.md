# ALARM R10 look study

This is an offline study made from the existing observatory and the authored griffin rig. It is not deployed to the live website.

The study tests a more translucent membrane with irregular secondary veins, individual scale relief on the torso and limbs, warmer directional lighting, bounded light scattering, weathered stone shading and denser ferns. The source model remains an approximation of the supplied target image; this is not a completed match or a tested real-time asset.

Reproduce from the repository root with the Python environment used by the existing wing builder:

```
python3 scripts/make_reference_wing_study.py
blender -b --python scripts/render_reference_study.py -- final
```

The first command needs numpy and scipy. The second uses Blender 4.3.2 and CPU Cycles. All inputs are existing assets in the repository. No image-generation service or paid model-generation request is used. The original body rig and its 16 clips are retained in the intermediate GLB; the extra relief plates in this still study have not yet been skinned. Procedural material detail and offline lighting need baking and performance validation before any website integration.

The output blend and PNG are generated into studies/. Do not commit generated binaries to this source branch. The final PNG is delivered separately for visual review.
