# AudioLab

AudioLab is the integrated audio-production workspace.

## Projects

Project cards show title, track/source counts, render/public state and last update. **New** creates a project.

## Sources and recording

Import source audio or record with microphone permission in runtimes supporting MediaRecorder/getUserMedia.

Sources remain preserved and can be added to tracks.

## Waveform/transport

Decoded audio renders as a waveform with playhead, seek and selection.

## Tracks/clips

Operations include placement, trim/selection, split, move between tracks and delete. Source audio remains preserved.

## Effects

Add effect, add preset, toggle, update parameters, reorder and delete.

## Transcript

Modes: Plain text and Timestamped cues.

Import TXT/SRT/VTT. SRT/VTT parse into cues.

Export text or WebVTT.

## Markers

Add at playhead; edit time/title/note; delete.

Markers can become chapter metadata.

## Episode metadata

Title, slug, description, episode/season, cover, explicit, credits, license and related fields.

## Rendering/delivery

Render final episode, download render, upload master, create delivery audio, upload delivery, copy/open public URL and run delivery/readiness checks.

A local-only render is not RSS-ready.

## Create episode draft

Hands the AudioLab project into native podcast content with public audio/enclosure, duration, summary, transcript, episode/season, cover, MIME/size, explicit, credits/license, markers, transcript cues, storage IDs, master/delivery URLs and delivery status.

AudioLab is built around preserved source blobs and a non-destructive project model.
