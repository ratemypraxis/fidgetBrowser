# Hand Tracking Gesture Control Chrome Extension

A Chrome extension that uses ML5.js hand tracking to detect hand gestures and control webpages. Move your thumb quickly to spin the entire webpage!

## Features

- Real-time hand tracking with 21 keypoints
- Visual hand skeleton overlay
- Thumb gesture detection (40% movement threshold)
- Webpage spin animation triggered by thumb movement
- Canvas overlay fixed to top-right corner of browser window

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `fidget-browser` directory
5. Grant camera permissions when prompted

## Usage

1. Navigate to any webpage
2. Allow camera access when prompted by the browser
3. Show your hand to the camera (the tracking canvas appears in the top-right corner)
4. Move your thumb quickly (more than 40% of thumb length) to trigger the webpage spin animation

## File Structure

```
fidget-browser/
├── manifest.json       # Chrome extension manifest
├── content.js         # Main content script with hand tracking logic
├── styles.css         # Styles for canvas positioning and spin animation
├── libs/
│   ├── p5.min.js     # p5.js library
│   └── ml5.min.js    # ml5.js library
└── index.html        # Original test page (for reference)
```

## How It Works

- Uses p5.js in instance mode to avoid conflicts with page JavaScript
- ML5.js handpose model detects hands and returns 21 landmarks per hand
- Calculates thumb length from landmark 1 (base) to landmark 4 (tip)
- Tracks thumb tip movement between frames
- Triggers spin animation when movement exceeds 40% of thumb length
- Applies CSS animation to entire webpage (html and body elements)

## Permissions

- `activeTab`: Required to inject content script into active tabs
- `host_permissions`: Required to run on all websites
- Camera access: Requested at runtime when extension loads

## Notes

- The canvas is positioned with maximum z-index to stay on top
- Canvas has `pointer-events: none` to allow clicks to pass through
- Spin animation duration is 0.5 seconds
- Extension prevents multiple simultaneous spins

