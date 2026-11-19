# ALARM approved-concept scene: R11 working checkpoint

## Approved target

The user approved the generated ivory/amber hybrid installation image on 20 November 2026. Preserve its raven head and beak, gorilla-derived gaze, cheetah body and limbs, Moloch tail, separate cockroach forewing/hindwing structures, carved ivory and amber appearance, warm observatory lighting and lush mountain setting.

Approved hero input: exec-ad189169-9e13-4b4c-b4d9-7a7afeda39a2.png.
Isolated production reference: exec-fc718d37-c4db-40a7-84f0-5a364c288345.png.
Generated panorama: exec-2e2b1355-ff6c-49b0-8e5a-72c1a4687dd2.png.
Generated images are retained by the conversation; do not overwrite them with the trial meshes or call trial renders approved.

## Actual work and quality gate

A free CPU reconstruction was run using the official MIT-licensed VAST-AI-Research/TripoSR repository at 107cefdc244c39106fa830359024f6a2f1c78871 and official stabilityai/TripoSR weights. This produced 37,312 vertices and 74,652 triangles at 256-voxel resolution. No paid generation was submitted.

The draft was inspected from multiple directions. It did not preserve the fine wing structure or the head sufficiently. A projected texture bake, separate measured wing surfaces and contour-loft head were tested. These retain appearance in the source view but do not establish faithful volume from other directions. The assembled full scene was rendered in Blender and failed the similarity gate: head volume, joins, source-view projection artifacts and detached ivy need correction. The draft is NOT animation-ready, NOT an approved 3D master, and NOT deployed.

The environment experiment adds physical flagstones, a three-course stone plinth and stone terminal cases, preserving the original display positions. build_approved_observatory.py is an experiment, not a production build step. Fix ivy attachment to stone surfaces and perspective/UV artifacts before presenting its output as faithful.

## Local experiment commands

reconstruct_approved_griffin.py accepts --triposr-root, --weights, --input, --output and --resolution. It needs CPU torch 2.6.0, transformers 4.46.3, huggingface-hub 0.26.5, trimesh 4.5.3, einops 0.7.0, omegaconf 2.3.0, scikit-image and Pillow. The supplied RGBA input means background removal is skipped. Marching cubes uses scikit-image on CPU; optional upstream rembg and CUDA-extension imports are shimmed only for this path. DINO config is downloaded from official facebook/dino-vitb16, model/config from official stabilityai/TripoSR.

refine_reconstructed_griffin.py and build_approved_observatory.py run under Blender 4.3.2, with their documented argument parsers. Inputs and outputs are local experiment artifacts; no new tool or account credential is embedded in these scripts.

## Next decision

A higher-detail image-to-3D candidate was inspected read-only: fal-ai/hyper3d/rodin/v2.5. The pricing API returned USD 0.40 per generation; this is a unit rate, not a guaranteed configuration-specific final charge. Its schema supports a 500K triangle high-tier GLB with PBR materials, original alpha, texture delight and no high-pack add-on. No upload or generation has been made through this endpoint. Any paid attempt requires user authorization and cost verification within the approved ceiling. It remains a fidelity experiment, not a guarantee or a completed animation rig.
