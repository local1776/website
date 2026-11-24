# Uniform photo outlines (Uniform Request form)

The tap-to-order photo (site/img/uniform/ocp-army.jpg, official U.S. Army photo, public domain, Wikimedia Commons
"ArmyacuOCP.jpg", cropped to 540x1280) has a tappable outline over each part.

- Cap, coat, trousers, boots: traced from the photo's pixels by trace-army.html (copy it into dist/, open /trace-army
  with tools/shoot.mjs --eval="window.__out"). It separates the uniform from the plain backdrop and uses boundaries
  measured on 3x gridded close-ups for the face/neck, both hands and the cap brim. Output: army-outlines.json.
- Tapes, rank, shoulder patches, undershirt: measured by hand on the same close-ups (in site/pages/uniform-mockup.html).
A new photo (Air Force, female) needs its own measured boundaries in a copy of trace-army.html.
