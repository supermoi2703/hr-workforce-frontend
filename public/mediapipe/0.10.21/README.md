# MediaPipe Tasks Vision for attendance

`vision_bundle.mjs`, its source map and the `wasm/` directory are unmodified files from
[`@mediapipe/tasks-vision` 0.10.21](https://registry.npmjs.org/@mediapipe/tasks-vision/-/tasks-vision-0.10.21.tgz).
The package's npm integrity is
`sha512-TuhKH+credq4zLksGbYrnvJ1aLIWMc5r0UHwzxzql4BHECJwIAoBR61ZrqwGOW6ZmSBIzU1t4VtKj8hbxFaKeA==`.
The runtime chooses the SIMD or non-SIMD WASM build based on browser capabilities.

`face_landmarker.task` is Google's [Face Landmarker float16 model, version 1](https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task).
Its SHA-256 is `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`.
Google's [Face Landmarker documentation](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker)
links the component model cards. MediaPipe and the component models are under Apache 2.0. See `LICENSE`.

Next.js serves these files from this directory. The attendance camera loads them from its own origin.
