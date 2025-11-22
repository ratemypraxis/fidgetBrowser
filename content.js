// Hand Tracking Chrome Extension Content Script
// Uses p5.js instance mode to avoid conflicts with page JavaScript

(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.handTrackingExtensionLoaded) {
    return;
  }
  window.handTrackingExtensionLoaded = true;
  
  // Create p5 instance in instance mode
  const handTrackingSketch = function(p) {
    // Global variables
    let video;
    let handpose;
    let hands = [];
    let modelLoaded = false;
    
    // Thumb tracking variables
    let previousThumbTip = null;
    let thumbLength = null;
    let isSpinning = false;
    
    // Camera error flag
    let cameraError = false;
    
    p.setup = function() {
      console.log('Hand tracking extension: Setting up...');
      
      // Create canvas with fixed size (320x240)
      let canvas = p.createCanvas(320, 240);
      canvas.id('handtracking-canvas');
      
      // Ensure canvas is added to document body
      if (canvas.elt && canvas.elt.parentNode !== document.body) {
        document.body.appendChild(canvas.elt);
      }
      
      console.log('Hand tracking extension: Canvas created and added to DOM');
      
      // Initialize video capture with error handling
      try {
        console.log('Hand tracking extension: Requesting camera access...');
        video = p.createCapture(p.VIDEO, function(stream) {
          console.log('Hand tracking extension: Video stream obtained');
        });
        
        // Set video size to match canvas exactly
        video.size(320, 240);
        video.hide(); // Hide the raw HTML video element
        
        // Handle video errors
        if (video.elt) {
          video.elt.onerror = function(err) {
            console.error('Hand tracking extension: Video error:', err);
            cameraError = true;
          };
          
          // Wait for video metadata to load
          video.elt.onloadedmetadata = function() {
            console.log('Hand tracking extension: Video metadata loaded');
            initializeHandpose();
          };
          
          // Also listen for when video can play
          video.elt.oncanplay = function() {
            console.log('Hand tracking extension: Video can play');
            if (!modelLoaded) {
              initializeHandpose();
            }
          };
        }
        
        // Fallback: initialize after a delay if metadata doesn't fire
        setTimeout(function() {
          if (!modelLoaded && video && video.elt) {
            if (video.elt.readyState >= 2) {
              console.log('Hand tracking extension: Initializing handpose (fallback)');
              initializeHandpose();
            } else {
              console.warn('Hand tracking extension: Video not ready, readyState:', video.elt.readyState);
            }
          }
        }, 2000);
        
      } catch (error) {
        console.error('Hand tracking extension: Failed to create video capture:', error);
        cameraError = true;
      }
    };
    
    function initializeHandpose() {
      if (handpose) {
        return; // Already initialized
      }
      
      try {
        console.log('Hand tracking extension: Initializing handpose model...');
        handpose = ml5.handpose(video, {
          flipHorizontal: false,
          maxNumHands: 2
        }, modelReady);
        
        // Listen for hand predictions
        handpose.on('predict', (results) => {
          hands = results;
        });
      } catch (error) {
        console.error('Hand tracking extension: Failed to initialize handpose:', error);
      }
    }
    
    function modelReady() {
      console.log('Hand tracking model loaded!');
      modelLoaded = true;
    }
    
    p.draw = function() {
      // Check for camera error first
      if (cameraError) {
        showCameraError();
        return;
      }
      
      // Draw video stream as background, scaled to canvas size
      if (video && video.loadedmetadata) {
        // Draw video to fill canvas exactly
        p.image(video, 0, 0, p.width, p.height);
      } else if (video && video.elt) {
        // Check if video element has an error
        if (video.elt.error) {
          cameraError = true;
          showCameraError();
          return;
        }
        // Show loading message while video is initializing
        p.background(0);
        p.fill(255);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(14);
        p.text('Requesting camera access...', p.width / 2, p.height / 2);
        return;
      } else {
        // No video yet, show loading
        p.background(0);
        p.fill(255);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(14);
        p.text('Initializing camera...', p.width / 2, p.height / 2);
        return;
      }
      
      // Draw hand keypoints if hands are detected
      if (hands && hands.length > 0) {
        drawHands();
      } else if (modelLoaded) {
        // Reset thumb tracking when no hands detected
        previousThumbTip = null;
        thumbLength = null;
        // Show message when no hands detected
        drawNoHandsMessage();
      }
    };
    
    function drawHands() {
      for (let i = 0; i < hands.length; i++) {
        const hand = hands[i];
        
        // Draw all 21 landmarks (keypoints)
        const landmarks = hand.landmarks;
        
        // Get video dimensions for coordinate scaling
        // ml5.js returns coordinates relative to the video element's actual size
        const videoWidth = video.elt ? video.elt.videoWidth : (video.width || 320);
        const videoHeight = video.elt ? video.elt.videoHeight : (video.height || 240);
        
        // Calculate scale factors to map from video coordinates to canvas coordinates
        const scaleX = p.width / videoWidth;
        const scaleY = p.height / videoHeight;
        
        // Calculate thumb length from landmark 1 to landmark 4
        if (landmarks.length >= 5) {
          const [x1, y1] = landmarks[1]; // Thumb MCP (base)
          const [x4, y4] = landmarks[4]; // Thumb tip
          
          // Calculate thumb length in video coordinates
          thumbLength = Math.sqrt(Math.pow(x4 - x1, 2) + Math.pow(y4 - y1, 2));
          
          // Check for thumb movement gesture
          if (previousThumbTip !== null && thumbLength > 0) {
            const [prevX, prevY] = previousThumbTip;
            const [currX, currY] = landmarks[4];
            
            // Calculate distance moved
            const distanceMoved = Math.sqrt(Math.pow(currX - prevX, 2) + Math.pow(currY - prevY, 2));
            
            // Check if movement exceeds 40% of thumb length
            const threshold = thumbLength * 0.4;
            
            if (distanceMoved > threshold && !isSpinning) {
              triggerSpin();
            }
          }
          
          // Update previous thumb tip position
          previousThumbTip = [landmarks[4][0], landmarks[4][1]];
        }
        
        // Draw keypoints
        for (let j = 0; j < landmarks.length; j++) {
          const [x, y, z] = landmarks[j];
          
          // Scale coordinates to match canvas size
          const scaledX = x * scaleX;
          const scaledY = y * scaleY;
          
          // Draw each keypoint as a circle
          p.fill(0, 255, 0); // Green color
          p.noStroke();
          p.circle(scaledX, scaledY, 10);
          
          // Optional: Draw smaller white center for better visibility
          p.fill(255);
          p.circle(scaledX, scaledY, 4);
        }
        
        // Optional: Draw connections between landmarks to show hand skeleton
        drawHandSkeleton(landmarks, scaleX, scaleY);
        
        // Draw hand bounding box (optional)
        drawBoundingBox(hand.boundingBox, scaleX, scaleY);
      }
    }
    
    function triggerSpin() {
      if (isSpinning) return; // Prevent multiple spins
      
      isSpinning = true;
      
      // Add spin animation to body and html
      document.body.classList.add('spinning');
      document.documentElement.classList.add('spinning');
      
      // Remove animation class after animation completes
      setTimeout(() => {
        document.body.classList.remove('spinning');
        document.documentElement.classList.remove('spinning');
        isSpinning = false;
      }, 500); // Match animation duration
    }
    
    function drawHandSkeleton(landmarks, scaleX, scaleY) {
      // Define connections between landmarks to form hand skeleton
      const connections = [
        // Thumb
        [0, 1], [1, 2], [2, 3], [3, 4],
        // Index finger
        [0, 5], [5, 6], [6, 7], [7, 8],
        // Middle finger
        [0, 9], [9, 10], [10, 11], [11, 12],
        // Ring finger
        [0, 13], [13, 14], [14, 15], [15, 16],
        // Pinky
        [0, 17], [17, 18], [18, 19], [19, 20],
        // Palm connections
        [5, 9], [9, 13], [13, 17]
      ];
      
      p.stroke(0, 255, 0, 150); // Semi-transparent green
      p.strokeWeight(2);
      
      for (let connection of connections) {
        const [i, j] = connection;
        const [x1, y1] = landmarks[i];
        const [x2, y2] = landmarks[j];
        // Scale coordinates to match canvas
        p.line(x1 * scaleX, y1 * scaleY, x2 * scaleX, y2 * scaleY);
      }
    }
    
    function drawBoundingBox(bbox, scaleX, scaleY) {
      if (!bbox) return;
      
      const { topLeft, bottomRight } = bbox;
      const [x1, y1] = topLeft;
      const [x2, y2] = bottomRight;
      
      // Scale coordinates to match canvas
      const scaledX1 = x1 * scaleX;
      const scaledY1 = y1 * scaleY;
      const scaledX2 = x2 * scaleX;
      const scaledY2 = y2 * scaleY;
      
      p.noFill();
      p.stroke(255, 0, 255); // Magenta color
      p.strokeWeight(2);
      p.rect(scaledX1, scaledY1, scaledX2 - scaledX1, scaledY2 - scaledY1);
    }
    
    function drawNoHandsMessage() {
      // Semi-transparent overlay
      p.fill(0, 0, 0, 100);
      p.noStroke();
      p.rect(0, 0, p.width, p.height);
      
      // Message text
      p.fill(255);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(16);
      p.text('No hands detected', p.width / 2, p.height / 2);
      p.textSize(12);
      p.text('Show your hand to the camera', p.width / 2, p.height / 2 + 25);
    }
    
    function showCameraError() {
      // Draw error message on canvas
      p.fill(255, 0, 0, 200);
      p.noStroke();
      p.rect(0, 0, p.width, p.height);
      
      p.fill(255);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(14);
      p.text('Camera access denied', p.width / 2, p.height / 2 - 10);
      p.textSize(12);
      p.text('Please allow camera access', p.width / 2, p.height / 2 + 10);
      p.text('and reload the page', p.width / 2, p.height / 2 + 25);
    }
  };
  
  // Wait for p5.js and ml5.js to be available, then initialize
  function initializeExtension() {
    if (typeof p5 === 'undefined') {
      console.error('Hand tracking extension: p5.js not loaded');
      setTimeout(initializeExtension, 100);
      return;
    }
    
    if (typeof ml5 === 'undefined') {
      console.error('Hand tracking extension: ml5.js not loaded');
      setTimeout(initializeExtension, 100);
      return;
    }
    
    console.log('Hand tracking extension: Libraries loaded, initializing p5...');
    // Initialize p5 in instance mode
    new p5(handTrackingSketch);
  }
  
  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
  } else {
    // DOM already loaded
    setTimeout(initializeExtension, 100);
  }
  
})();

