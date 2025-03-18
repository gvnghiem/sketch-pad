const canvas = document.getElementById('sketchCanvas');
const ctx = canvas.getContext('2d');

// Canvas defaults
const DEFAULT_PORTRAIT_WIDTH = 595;  // A4 width in pixels
const DEFAULT_PORTRAIT_HEIGHT = 842; // A4 height in pixels
let canvasPixelSize = 1; // Default pixel size (for 8-bit and 16-bit modes)

// Tool variables
let tool = 'pen';
let drawing = false;
let startX, startY, currentX, currentY;
let opacity = 1;
let thickness = 5;
let gridVisible = false;
let layout = 'blank';
let selectedArea = null;
let currentColor = '#000000';
let lastX, lastY; // For tools like spray paint

// Create a main drawing layer
let mainCanvas = document.createElement('canvas');
let mainCtx = mainCanvas.getContext('2d');
mainCanvas.width = canvas.width;
mainCanvas.height = canvas.height;

// Off-screen canvas for previews
const previewCanvas = document.createElement('canvas');
const previewCtx = previewCanvas.getContext('2d');
previewCanvas.width = canvas.width;
previewCanvas.height = canvas.height;

// Initialize history manager
let history;

// Define all tool categories and their tools
const toolCategories = {
    'draw': ['pencil', 'pen', 'marker', 'sprayPaint', 'paintBrush', 'waterBrush'],
    'objects': ['line', 'arrow', 'circle', 'rect', 'triangle', 'oval', 'pentagon', 'hexagon'],
    'tools': ['eraser', 'fillBucket', 'marquee']
};

// Combine all tools into a single array for active state tracking
const allTools = [].concat(
    ...Object.values(toolCategories)
);

const colors = [
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#000000', '#FFFFFF'
];

document.getElementById('colorPicker').addEventListener('input', (e) => {
    currentColor = e.target.value;
    updateColorSwatches();
});
document.getElementById('hexInput').addEventListener('input', (e) => {
    const hex = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        currentColor = hex;
        updateColorSwatches();
    }
});

document.getElementById('clear').addEventListener('click', clearCanvas);
document.getElementById('opacity').addEventListener('input', (e) => opacity = e.target.value);
document.getElementById('thickness').addEventListener('input', (e) => thickness = parseInt(e.target.value));
document.getElementById('grid').addEventListener('change', (e) => {
    gridVisible = e.target.checked;
    drawCanvas();
});
document.getElementById('layout').addEventListener('change', function(e) {
    const newLayout = e.target.value;
    console.log('Layout changed to:', newLayout);

    // Only proceed if actually changing layouts
    if (newLayout !== layout) {
        if (confirm('Changing layout will reset your canvas. Continue?')) {
            setCanvasLayout(newLayout);
        } else {
            // Reset dropdown to current layout if user cancels
            e.target.value = layout;
        }
    }
});

// Function to update tool availability based on layout
function updateToolAvailability() {
    // Get all object tool buttons
    const objectTools = toolCategories.objects;

    // Enable or disable object tools based on layout
    objectTools.forEach(toolId => {
        const toolBtn = document.getElementById(toolId);
        if (toolBtn) {
            if (layout === '8-bit' || layout === '16-bit') {
                // Disable object tools in bit modes
                toolBtn.disabled = true;
                toolBtn.classList.add('disabled-tool');
                toolBtn.title = toolBtn.title + ' (Not available in pixel art mode)';
            } else {
                // Enable object tools in regular modes
                toolBtn.disabled = false;
                toolBtn.classList.remove('disabled-tool');
                toolBtn.title = toolBtn.title.replace(' (Not available in pixel art mode)', '');
            }
        }
    });

    // If current tool is an object tool and we're in bit mode, switch to pen
    if ((layout === '8-bit' || layout === '16-bit') && toolCategories.objects.includes(tool)) {
        tool = 'pen'; // Switch to pen tool
        updateActiveTool(); // Update the active tool indicator
    }
}

function setCanvasLayout(layoutType) {
    console.log('Setting layout to:', layoutType);

    // Update layout variable
    layout = layoutType;

    // Remove previous layout classes from canvas container
    const canvasContainer = document.querySelector('.canvas-container');
    canvasContainer.classList.remove('portrait', 'landscape', 'bit-8', 'bit-16', 'two-column');

    // Set canvas dimensions and properties based on layout
    switch(layoutType) {
        case 'portrait':
            canvas.width = DEFAULT_PORTRAIT_WIDTH;
            canvas.height = DEFAULT_PORTRAIT_HEIGHT;
            canvasPixelSize = 1;
            canvasContainer.classList.add('portrait');
            disablePixelatedMode();
            break;

        case 'landscape':
            canvas.width = DEFAULT_PORTRAIT_HEIGHT; // Swap dimensions
            canvas.height = DEFAULT_PORTRAIT_WIDTH;
            canvasPixelSize = 1;
            canvasContainer.classList.add('landscape');
            disablePixelatedMode();
            break;

        case '8-bit':
            canvas.width = DEFAULT_PORTRAIT_WIDTH;
            canvas.height = DEFAULT_PORTRAIT_HEIGHT;
            canvasPixelSize = 8; // 8-bit style pixels
            canvasContainer.classList.add('bit-8', 'bit-mode');
            enablePixelatedMode();
            // Automatically enable grid for pixel art modes
            gridVisible = true;
            const gridCheckbox = document.getElementById('grid');
            if (gridCheckbox) {
                gridCheckbox.checked = true;
            }
            break;

        case '16-bit':
            canvas.width = DEFAULT_PORTRAIT_WIDTH;
            canvas.height = DEFAULT_PORTRAIT_HEIGHT;
            canvasPixelSize = 4; // 16-bit style pixels
            canvasContainer.classList.add('bit-16', 'bit-mode');
            enablePixelatedMode();
            // Automatically enable grid for pixel art modes
            gridVisible = true;
            const gridCheckbox16 = document.getElementById('grid');
            if (gridCheckbox16) {
                gridCheckbox16.checked = true;
            }
            break;

        case 'two-column':
            canvas.width = DEFAULT_PORTRAIT_WIDTH;
            canvas.height = DEFAULT_PORTRAIT_HEIGHT;
            canvasPixelSize = 1;
            canvasContainer.classList.add('two-column');
            disablePixelatedMode();
            break;

        default:
            canvas.width = DEFAULT_PORTRAIT_WIDTH;
            canvas.height = DEFAULT_PORTRAIT_HEIGHT;
            canvasPixelSize = 1;
            canvasContainer.classList.add('portrait');
            disablePixelatedMode();
    }

    // Update layout indicator if it exists, or create it
    let layoutIndicator = document.querySelector('.layout-indicator');
    if (!layoutIndicator) {
        layoutIndicator = document.createElement('div');
        layoutIndicator.className = 'layout-indicator';
        canvasContainer.appendChild(layoutIndicator);
    }

    // Update the indicator text
    layoutIndicator.textContent = layoutType === 'two-column' ? 'Two-Column' :
                                 layoutType.charAt(0).toUpperCase() + layoutType.slice(1);

    // Resize all canvas layers
    mainCanvas.width = canvas.width;
    mainCanvas.height = canvas.height;
    previewCanvas.width = canvas.width;
    previewCanvas.height = canvas.height;

    // Clear canvases
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // Reset history for the new layout
    history = new CanvasHistory(mainCanvas);

    // Update tool availability based on the new layout
    updateToolAvailability();

    // Update cursor style if needed
    updateCursorStyle();

    // Draw canvas with current layout
    drawCanvas();

    // Update pixel size indicator
    updatePixelSizeIndicator();

    console.log('Canvas dimensions set to:', canvas.width, 'x', canvas.height);
    console.log('Pixel size set to:', canvasPixelSize);
}

function enablePixelatedMode() {
    // Set canvas rendering to be pixelated
    canvas.style.imageRendering = 'pixelated';
    mainCanvas.style.imageRendering = 'pixelated';
    previewCanvas.style.imageRendering = 'pixelated';

    // Set the context to use nearest-neighbor interpolation
    ctx.imageSmoothingEnabled = false;
    mainCtx.imageSmoothingEnabled = false;
    previewCtx.imageSmoothingEnabled = false;

    // Add zoom controls for bit modes if they don't exist
    const canvasContainer = document.querySelector('.canvas-container');
    if (!document.querySelector('.zoom-controls')) {
        const zoomControls = document.createElement('div');
        zoomControls.className = 'zoom-controls';
        zoomControls.innerHTML = `
            <button class="zoom-btn zoom-in" title="Zoom In">+</button>
            <div class="zoom-level">100%</div>
            <button class="zoom-btn zoom-out" title="Zoom Out">-</button>
        `;
        canvasContainer.appendChild(zoomControls);

        // Add event listeners for zoom controls
        document.querySelector('.zoom-in').addEventListener('click', () => {
            zoomCanvas(1.2); // Zoom in
        });
        document.querySelector('.zoom-out').addEventListener('click', () => {
            zoomCanvas(0.8); // Zoom out
        });
    }
}

function disablePixelatedMode() {
    // Set canvas rendering to smooth (default)
    canvas.style.imageRendering = 'auto';
    mainCanvas.style.imageRendering = 'auto';
    previewCanvas.style.imageRendering = 'auto';

    // Enable smoothing
    ctx.imageSmoothingEnabled = true;
    mainCtx.imageSmoothingEnabled = true;
    previewCtx.imageSmoothingEnabled = true;

    // Remove zoom controls if they exist
    const zoomControls = document.querySelector('.zoom-controls');
    if (zoomControls) {
        zoomControls.remove();
    }
}

// Modify the draw function to handle pixelated modes
function snapToPixelGrid(x, y) {
    if (canvasPixelSize <= 1) return { x, y };

    // Snap coordinates to the pixel grid
    return {
        x: Math.floor(x / canvasPixelSize) * canvasPixelSize,
        y: Math.floor(y / canvasPixelSize) * canvasPixelSize
    };
}

// Add or update pixel size indicator for bit modes
function updatePixelSizeIndicator() {
    const canvasContainer = document.querySelector('.canvas-container');
    let pixelIndicator = document.querySelector('.pixel-size-indicator');

    // Create the indicator if it doesn't exist
    if (!pixelIndicator) {
        pixelIndicator = document.createElement('div');
        pixelIndicator.className = 'pixel-size-indicator';
        canvasContainer.appendChild(pixelIndicator);
    }

    // Show appropriate indicator text based on mode
    if (layout === '8-bit') {
        pixelIndicator.textContent = `Pixel: 8×8`;
    } else if (layout === '16-bit') {
        pixelIndicator.textContent = `Pixel: 4×4`;
    }
}


// Zoom canvas for bit modes
let currentZoom = 1.0;
function zoomCanvas(factor) {
    currentZoom *= factor;
    // Limit zoom range
    currentZoom = Math.max(0.5, Math.min(currentZoom, 5.0));

    const canvasDisplay = document.getElementById('sketchCanvas');
    canvasDisplay.style.transform = `scale(${currentZoom})`;
    canvasDisplay.style.transformOrigin = 'center';

    // Update zoom level display
    const zoomLevel = document.querySelector('.zoom-level');
    if (zoomLevel) {
        zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
    }
}

// Function to handle drawing in pixelated mode
function drawPixelatedPoint(x, y, color) {
    // Snap to pixel grid
    const snappedX = Math.floor(x / canvasPixelSize) * canvasPixelSize;
    const snappedY = Math.floor(y / canvasPixelSize) * canvasPixelSize;

    // Set fill color
    mainCtx.fillStyle = color;

    // Draw the pixel
    mainCtx.fillRect(snappedX, snappedY, canvasPixelSize, canvasPixelSize);
}

function updateActiveTool() {
    tools.forEach(t => {
        const btn = document.getElementById(t);
        btn.classList.toggle('active', t === tool);
    });
}

function updateColorSwatches() {
    document.querySelectorAll('#colorPalette div').forEach(swatch => {
        swatch.style.border = swatch.style.backgroundColor === currentColor ? '2px solid #000' : 'none';
    });
    document.getElementById('colorPicker').value = currentColor;
    document.getElementById('hexInput').value = currentColor;
}

// Mouse events
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// Add touch events
canvas.addEventListener('touchstart', handleTouchStart);
canvas.addEventListener('touchmove', handleTouchMove);
canvas.addEventListener('touchend', handleTouchEnd);
canvas.addEventListener('touchcancel', handleTouchEnd);

// Touch event handlers
function handleTouchStart(e) {
    e.preventDefault(); // Prevent scrolling
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function handleTouchEnd(e) {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    canvas.dispatchEvent(mouseEvent);
}

function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();

    // Calculate actual position accounting for any scaling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Get the precise cursor position
    let x = (e.clientX - rect.left) * scaleX;
    let y = (e.clientY - rect.top) * scaleY;

    // Handle pixel snapping for 8-bit and 16-bit modes
    if (layout === '8-bit' || layout === '16-bit') {
        x = Math.floor(x / canvasPixelSize) * canvasPixelSize;
        y = Math.floor(y / canvasPixelSize) * canvasPixelSize;
    }

    return { x, y };
}

// Update cursor styles based on the current tool
function updateCursorStyle() {
    // Set cursor based on current tool
    if (toolCategories.draw.includes(tool)) {
        // Drawing tools
        canvas.style.cursor = 'crosshair';
    } else if (tool === 'eraser') {
        // Eraser
        canvas.style.cursor = 'crosshair';
    } else if (tool === 'fillBucket') {
        // Fill bucket
        canvas.style.cursor = 'pointer';
    } else if (toolCategories.objects.includes(tool)) {
        // Shape tools
        canvas.style.cursor = 'crosshair';
    } else if (tool === 'marquee') {
        // Selection tool
        canvas.style.cursor = 'crosshair';
    } else {
        // Default
        canvas.style.cursor = 'default';
    }

    // Special handling for bit modes
    if (layout === '8-bit' || layout === '16-bit') {
        canvas.style.cursor = 'crosshair';
    }
}

function startDrawing(e) {
    drawing = true;
    const coords = getCanvasCoordinates(e);
    startX = coords.x;
    startY = coords.y;
    lastX = startX;
    lastY = startY;

    // For shape tools, always start from scratch with each new shape
    if (toolCategories.objects.includes(tool)) {
        // Clear any previous coordinates
        currentX = null;
        currentY = null;
    }

    if (tool === 'marquee') {
        selectedArea = { x: startX, y: startY, width: 0, height: 0 };
    } else if (tool === 'fillBucket') {
        // Execute fill immediately
        fillArea(startX, startY);
        drawing = false; // End drawing immediately for fill bucket

        // Save state after fill operation
        history.saveState();
    } else if (tool === 'eraser') {
        // Set up for eraser
        mainCtx.beginPath();
        mainCtx.moveTo(startX, startY);
        mainCtx.lineCap = 'round';
        mainCtx.lineJoin = 'round';
    } else if (toolCategories.objects.includes(tool)) {
        // For object tools, start preview mode
        // Set up common properties for preview
        previewCtx.globalAlpha = opacity;
        previewCtx.lineWidth = thickness;
        previewCtx.strokeStyle = currentColor;
        previewCtx.fillStyle = currentColor;
    } else {
        // For drawing tools, set up initial path
        mainCtx.beginPath();
        mainCtx.moveTo(startX, startY);
    }
}

function draw(e) {
    if (!drawing) return;
    const coords = getCanvasCoordinates(e);
    currentX = coords.x;
    currentY = coords.y;

    // Set common style properties
    mainCtx.globalAlpha = opacity;
    mainCtx.lineWidth = thickness;
    mainCtx.strokeStyle = currentColor;
    mainCtx.fillStyle = currentColor;
    previewCtx.globalAlpha = opacity;
    previewCtx.lineWidth = thickness;
    previewCtx.strokeStyle = currentColor;
    previewCtx.fillStyle = currentColor;

    // Shape tools (like line, circle, rect) always use preview regardless of layout
    if (tool === 'line' || tool === 'circle' || tool === 'rect' ||
        tool === 'arrow' || tool === 'triangle' || tool === 'oval' ||
        tool === 'hexagon' || tool === 'pentagon') {

        // For 8-bit and 16-bit modes, use pixelated preview
        if (layout === '8-bit' || layout === '16-bit') {
            drawPreviewPixelated();
        } else {
            drawPreview();
        }
        return; // Exit early after handling shape tools
    }

    // Handle marquee selection tool
    if (tool === 'marquee') {
        selectedArea.width = currentX - startX;
        selectedArea.height = currentY - startY;
        drawPreview();
        return; // Exit early
    }

    // Handle different drawing tools based on layout
    if (layout === '8-bit' || layout === '16-bit') {
        // Pixel art mode drawing tools
        if (tool === 'eraser') {
            // Eraser in pixel mode just clears the pixel
            const snappedX = Math.floor(currentX / canvasPixelSize) * canvasPixelSize;
            const snappedY = Math.floor(currentY / canvasPixelSize) * canvasPixelSize;
            mainCtx.clearRect(snappedX, snappedY, canvasPixelSize, canvasPixelSize);
        }
        else if (tool === 'fillBucket') {
            // Fill operation is triggered on mouse down, not here
        }
        else if (tool === 'pen' || tool === 'pencil' || tool === 'marker' ||
                 tool === 'paintBrush' || tool === 'sprayPaint' || tool === 'waterBrush') {
            // Draw line between last and current point to ensure continuous drawing
            const points = getLinePoints(lastX, lastY, currentX, currentY);
            for (const point of points) {
                const px = Math.floor(point.x / canvasPixelSize) * canvasPixelSize;
                const py = Math.floor(point.y / canvasPixelSize) * canvasPixelSize;
                mainCtx.fillRect(px, py, canvasPixelSize, canvasPixelSize);
            }

            // Update last position
            lastX = currentX;
            lastY = currentY;
        }
    }
    else {
        // Regular drawing mode
        if (tool === 'eraser') {
            // For eraser, use destination-out composite operation to clear pixels
            mainCtx.lineCap = 'round';
            mainCtx.lineJoin = 'round';
            // Save the current globalCompositeOperation
            const currentCompositeOperation = mainCtx.globalCompositeOperation;
            // Set to erase mode
            mainCtx.globalCompositeOperation = 'destination-out';
            // Draw the eraser path
            mainCtx.lineTo(currentX, currentY);
            mainCtx.stroke();
            // Restore the previous composite operation
            mainCtx.globalCompositeOperation = currentCompositeOperation;
        }
        else if (tool === 'pen') {
            mainCtx.lineCap = 'round';
            mainCtx.lineTo(currentX, currentY);
            mainCtx.stroke();
        }
        else if (tool === 'pencil') {
            mainCtx.lineCap = 'round';
            mainCtx.globalAlpha = opacity * 0.5;
            mainCtx.lineTo(currentX, currentY);
            mainCtx.stroke();
        }
        else if (tool === 'paintBrush') {
            mainCtx.lineCap = 'round';
            mainCtx.lineWidth = thickness * 2;
            mainCtx.lineTo(currentX, currentY);
            mainCtx.stroke();
        }
        else if (tool === 'marker') {
            mainCtx.lineCap = 'square';
            mainCtx.globalAlpha = 0.5;
            mainCtx.lineTo(currentX, currentY);
            mainCtx.stroke();
        }
        else if (tool === 'sprayPaint') {
            const density = thickness * 2;
            const radius = thickness * 2;

            for (let i = 0; i < density; i++) {
                const offsetX = getRandomInt(-radius, radius);
                const offsetY = getRandomInt(-radius, radius);

                if (offsetX * offsetX + offsetY * offsetY <= radius * radius) {
                    const x = currentX + offsetX;
                    const y = currentY + offsetY;

                    mainCtx.beginPath();
                    mainCtx.fillStyle = currentColor;
                    mainCtx.globalAlpha = opacity * 0.3;
                    mainCtx.arc(x, y, 1, 0, Math.PI * 2);
                    mainCtx.fill();
                }
            }
        }
        else if (tool === 'waterBrush') {
            mainCtx.lineCap = 'round';
            mainCtx.lineWidth = thickness;

            const gradient = mainCtx.createLinearGradient(lastX, lastY, currentX, currentY);
            gradient.addColorStop(0, currentColor);
            gradient.addColorStop(1, currentColor + '80');

            mainCtx.strokeStyle = gradient;
            mainCtx.globalAlpha = opacity * 0.7;
            mainCtx.lineTo(currentX, currentY);
            mainCtx.stroke();

            lastX = currentX;
            lastY = currentY;
        }
    }

    // Update display
    renderCanvas();
}

// Regular preview function for shape tools
function drawPreview() {
    // Clear the preview canvas
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // Draw existing content from main canvas
    previewCtx.drawImage(mainCanvas, 0, 0);

    // Set common properties
    previewCtx.globalAlpha = opacity;
    previewCtx.lineWidth = thickness;
    previewCtx.strokeStyle = currentColor;
    previewCtx.fillStyle = currentColor;

    // Only draw if we have valid coordinates
    if (startX !== null && startY !== null && currentX !== null && currentY !== null) {
        // Draw preview of current shape
        if (tool === 'line') {
            previewCtx.beginPath();
            previewCtx.moveTo(startX, startY);
            previewCtx.lineTo(currentX, currentY);
            previewCtx.stroke();
        } else if (tool === 'arrow') {
            drawArrow(previewCtx, startX, startY, currentX, currentY);
        } else if (tool === 'circle') {
            const radius = Math.sqrt((currentX - startX) ** 2 + (currentY - startY) ** 2);
            previewCtx.beginPath();
            previewCtx.arc(startX, startY, radius, 0, Math.PI * 2);
            previewCtx.stroke();
        } else if (tool === 'rect') {
            previewCtx.beginPath();
            previewCtx.strokeRect(startX, startY, currentX - startX, currentY - startY);
        } else if (tool === 'triangle') {
            drawTriangle(previewCtx, startX, startY, currentX, currentY);
        } else if (tool === 'oval') {
            drawOval(previewCtx, startX, startY, currentX, currentY);
        } else if (tool === 'pentagon') {
            drawPolygon(previewCtx, startX, startY, currentX, currentY, 5);
        } else if (tool === 'hexagon') {
            drawPolygon(previewCtx, startX, startY, currentX, currentY, 6);
        } else if (tool === 'marquee' && selectedArea) {
            previewCtx.setLineDash([5, 5]);
            previewCtx.strokeRect(startX, startY, selectedArea.width, selectedArea.height);
            previewCtx.setLineDash([]);
        }
    }

    // Apply layout and grid to preview
    applyLayoutAndGrid(previewCtx);

    // Render the preview to main canvas
    renderCanvas(true);
}
// Draw pixelated preview for shape tools in bit modes
function drawPreviewPixelated() {
    // Clear the preview canvas
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // Draw existing content from main canvas
    previewCtx.drawImage(mainCanvas, 0, 0);

    // Snapped coordinates for bit modes
    const snapStartX = Math.floor(startX / canvasPixelSize) * canvasPixelSize;
    const snapStartY = Math.floor(startY / canvasPixelSize) * canvasPixelSize;
    const snapEndX = Math.floor(currentX / canvasPixelSize) * canvasPixelSize;
    const snapEndY = Math.floor(currentY / canvasPixelSize) * canvasPixelSize;

    // Set common properties
    previewCtx.fillStyle = currentColor;

    // Draw preview based on tool
    if (tool === 'line') {
        const points = getLinePoints(snapStartX, snapStartY, snapEndX, snapEndY);
        for (const point of points) {
            const px = Math.floor(point.x / canvasPixelSize) * canvasPixelSize;
            const py = Math.floor(point.y / canvasPixelSize) * canvasPixelSize;
            previewCtx.fillRect(px, py, canvasPixelSize, canvasPixelSize);
        }
    }
    else if (tool === 'rect') {
        // Draw rectangle border using individual pixels
        const width = snapEndX - snapStartX;
        const height = snapEndY - snapStartY;

        // Top and bottom edges
        for (let x = 0; x <= Math.abs(width); x += canvasPixelSize) {
            previewCtx.fillRect(
                snapStartX + (width >= 0 ? x : -x),
                snapStartY,
                canvasPixelSize,
                canvasPixelSize
            );
            previewCtx.fillRect(
                snapStartX + (width >= 0 ? x : -x),
                snapStartY + height - (height >= 0 ? 0 : canvasPixelSize),
                canvasPixelSize,
                canvasPixelSize
            );
        }

        // Left and right edges
        for (let y = canvasPixelSize; y < Math.abs(height); y += canvasPixelSize) {
            previewCtx.fillRect(
                snapStartX,
                snapStartY + (height >= 0 ? y : -y),
                canvasPixelSize,
                canvasPixelSize
            );
            previewCtx.fillRect(
                snapStartX + width - (width >= 0 ? 0 : canvasPixelSize),
                snapStartY + (height >= 0 ? y : -y),
                canvasPixelSize,
                canvasPixelSize
            );
        }
    }
    else if (tool === 'circle') {
        // Draw circle using Bresenham's circle algorithm
        const radius = Math.round(Math.sqrt((snapEndX - snapStartX) ** 2 + (snapEndY - snapStartY) ** 2) / canvasPixelSize) * canvasPixelSize;
        const centerX = snapStartX;
        const centerY = snapStartY;

        // Draw circle using pixelated points
        const points = getCirclePoints(centerX, centerY, radius);
        for (const point of points) {
            previewCtx.fillRect(
                Math.floor(point.x / canvasPixelSize) * canvasPixelSize,
                Math.floor(point.y / canvasPixelSize) * canvasPixelSize,
                canvasPixelSize,
                canvasPixelSize
            );
        }
    }
    // Add more shape drawing for pixel art as needed

    // Apply layout and grid to preview
    applyLayoutAndGrid(previewCtx);

    // Render the preview
    renderCanvas(true);
}

// Get points along a circle using Bresenham's circle algorithm
function getCirclePoints(centerX, centerY, radius) {
    const points = [];
    let x = 0;
    let y = radius;
    let d = 3 - 2 * radius;

    // Helper to add all 8 symmetric points
    function addCirclePoints(cx, cy, x, y) {
        points.push({x: cx + x, y: cy + y});
        points.push({x: cx - x, y: cy + y});
        points.push({x: cx + x, y: cy - y});
        points.push({x: cx - x, y: cy - y});
        points.push({x: cx + y, y: cy + x});
        points.push({x: cx - y, y: cy + x});
        points.push({x: cx + y, y: cy - x});
        points.push({x: cx - y, y: cy - x});
    }

    // Initial points
    addCirclePoints(centerX, centerY, x, y);

    while (y >= x) {
        x++;
        if (d > 0) {
            y--;
            d = d + 4 * (x - y) + 10;
        } else {
            d = d + 4 * x + 6;
        }
        addCirclePoints(centerX, centerY, x, y);
    }

    return points;
}


// Drawing helper functions for complex shapes
function drawArrow(ctx, fromX, fromY, toX, toY) {
    // Calculate direction and length
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    // Set consistent head length
    const headLength = Math.min(thickness * 3, Math.sqrt(dx*dx + dy*dy) / 3);

    // Draw the line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Draw the arrow head
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI/6), toY - headLength * Math.sin(angle - Math.PI/6));
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI/6), toY - headLength * Math.sin(angle + Math.PI/6));
    ctx.closePath();
    ctx.fillStyle = currentColor;
    ctx.fill();
}

function drawTriangle(ctx, startX, startY, endX, endY) {
    const width = endX - startX;
    const height = endY - startY;

    ctx.beginPath();
    ctx.moveTo(startX + width/2, startY); // Top point
    ctx.lineTo(startX, endY); // Bottom left
    ctx.lineTo(endX, endY); // Bottom right
    ctx.closePath();
    ctx.stroke();
}

function drawOval(ctx, startX, startY, endX, endY) {
    const centerX = (startX + endX) / 2;
    const centerY = (startY + endY) / 2;
    const radiusX = Math.abs(endX - startX) / 2;
    const radiusY = Math.abs(endY - startY) / 2;

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();
}

function drawPolygon(ctx, startX, startY, endX, endY, sides) {
    const centerX = (startX + endX) / 2;
    const centerY = (startY + endY) / 2;
    const radius = Math.min(
        Math.abs(endX - startX) / 2,
        Math.abs(endY - startY) / 2
    );

    ctx.beginPath();

    for (let i = 0; i < sides; i++) {
        const angle = i * 2 * Math.PI / sides - Math.PI / 2; // Start from top
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.closePath();
    ctx.stroke();
}

function fillArea(x, y) {
    // Get the image data for the entire canvas
    const imageData = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
    const data = imageData.data;
    const width = mainCanvas.width;
    const height = mainCanvas.height;

    // Convert hex color to RGBA
    const fillColorRGB = hexToRgb(currentColor);
    const fillR = fillColorRGB.r;
    const fillG = fillColorRGB.g;
    const fillB = fillColorRGB.b;
    const fillA = 255; // Full alpha

    // Get target color at the clicked point
    const pos = (Math.floor(y) * width + Math.floor(x)) * 4;
    const targetR = data[pos];
    const targetG = data[pos + 1];
    const targetB = data[pos + 2];
    const targetA = data[pos + 3];

    // Don't fill if colors are the same
    if (fillR === targetR && fillG === targetG && fillB === targetB && fillA === targetA) {
        return;
    }

    // Define a threshold for color comparison to handle anti-aliasing
    const colorThreshold = 10;

    // Function to check if a color is a boundary (significantly different from target)
    const isBoundary = (r, g, b, a) => {
        // If target is transparent and this pixel isn't, it's a boundary
        if (targetA < 10 && a > 10) return true;

        // If this pixel is transparent and target isn't, it's a boundary
        if (a < 10 && targetA > 10) return true;

        // If colors are significantly different, it's a boundary
        return (
            Math.abs(r - targetR) > colorThreshold ||
            Math.abs(g - targetG) > colorThreshold ||
            Math.abs(b - targetB) > colorThreshold
        );
    };

    // Stack for flood fill algorithm
    const stack = [{x: Math.floor(x), y: Math.floor(y)}];
    const visited = new Set(); // Track visited pixels to avoid reprocessing

    // Directions for 4-way fill (simpler and more predictable than 8-way)
    const directions = [
        {dx: 0, dy: 1},  // down
        {dx: 1, dy: 0},  // right
        {dx: 0, dy: -1}, // up
        {dx: -1, dy: 0}  // left
    ];

    while (stack.length) {
        const current = stack.pop();
        const cx = current.x;
        const cy = current.y;

        // Skip if out of bounds
        if (cx < 0 || cy < 0 || cx >= width || cy >= height) {
            continue;
        }

        // Create a unique key for this pixel
        const key = `${cx},${cy}`;

        // Skip if already visited
        if (visited.has(key)) {
            continue;
        }

        visited.add(key);

        const pixelPos = (cy * width + cx) * 4;

        // Check if this pixel matches the target color (not a boundary)
        if (!isBoundary(
            data[pixelPos],
            data[pixelPos + 1],
            data[pixelPos + 2],
            data[pixelPos + 3]
        )) {
            // Set the color
            data[pixelPos] = fillR;
            data[pixelPos + 1] = fillG;
            data[pixelPos + 2] = fillB;
            data[pixelPos + 3] = fillA;

            // Add adjacent pixels to stack
            for (const dir of directions) {
                stack.push({x: cx + dir.dx, y: cy + dir.dy});
            }
        }
    }

    // Update the canvas with the filled area
    mainCtx.putImageData(imageData, 0, 0);
    renderCanvas();
}

function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Parse hex values
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return { r, g, b };
}

function drawPreview() {
    // Clear the preview canvas
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // Draw existing content from main canvas
    previewCtx.drawImage(mainCanvas, 0, 0);

    // Set common properties
    previewCtx.globalAlpha = opacity;
    previewCtx.lineWidth = thickness;
    previewCtx.strokeStyle = currentColor;
    previewCtx.fillStyle = currentColor;

    // Only draw if we have valid coordinates
    if (startX !== null && startY !== null && currentX !== null && currentY !== null) {
        // Draw preview of current shape
        if (tool === 'line') {
            previewCtx.beginPath();
            previewCtx.moveTo(startX, startY);
            previewCtx.lineTo(currentX, currentY);
            previewCtx.stroke();
        } else if (tool === 'arrow') {
            drawArrow(previewCtx, startX, startY, currentX, currentY);
        } else if (tool === 'circle') {
            const radius = Math.sqrt((currentX - startX) ** 2 + (currentY - startY) ** 2);
            previewCtx.beginPath();
            previewCtx.arc(startX, startY, radius, 0, Math.PI * 2);
            previewCtx.stroke();
        } else if (tool === 'rect') {
            previewCtx.beginPath();
            previewCtx.strokeRect(startX, startY, currentX - startX, currentY - startY);
        } else if (tool === 'triangle') {
            drawTriangle(previewCtx, startX, startY, currentX, currentY);
        } else if (tool === 'oval') {
            drawOval(previewCtx, startX, startY, currentX, currentY);
        } else if (tool === 'pentagon') {
            drawPolygon(previewCtx, startX, startY, currentX, currentY, 5);
        } else if (tool === 'hexagon') {
            drawPolygon(previewCtx, startX, startY, currentX, currentY, 6);
        } else if (tool === 'marquee' && selectedArea) {
            previewCtx.setLineDash([5, 5]);
            previewCtx.strokeRect(startX, startY, selectedArea.width, selectedArea.height);
            previewCtx.setLineDash([]);
        }
    }

    // Apply layout and grid to preview
    applyLayoutAndGrid(previewCtx);

    // Render the preview to main canvas
    renderCanvas(true);
}

// Helper function for random integers (for spray paint)
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function for random floats
function getRandomFloat(min, max) {
    return min + Math.random() * (max - min);
}

function stopDrawing() {
    if (!drawing) return;
    drawing = false;

    if (toolCategories.objects.includes(tool)) {
        // Commit the shape to the main canvas
        mainCtx.globalAlpha = opacity;
        mainCtx.lineWidth = thickness;
        mainCtx.strokeStyle = currentColor;

        if (tool === 'line') {
            mainCtx.beginPath();
            mainCtx.moveTo(startX, startY);
            mainCtx.lineTo(currentX, currentY);
            mainCtx.stroke();
        } else if (tool === 'arrow') {
            drawArrow(mainCtx, startX, startY, currentX, currentY);
        } else if (tool === 'circle') {
            const radius = Math.sqrt((currentX - startX) ** 2 + (currentY - startY) ** 2);
            mainCtx.beginPath();
            mainCtx.arc(startX, startY, radius, 0, Math.PI * 2);
            mainCtx.stroke();
        } else if (tool === 'rect') {
            mainCtx.beginPath();
            mainCtx.strokeRect(startX, startY, currentX - startX, currentY - startY);
        } else if (tool === 'triangle') {
            drawTriangle(mainCtx, startX, startY, currentX, currentY);
        } else if (tool === 'oval') {
            drawOval(mainCtx, startX, startY, currentX, currentY);
        } else if (tool === 'pentagon') {
            drawPolygon(mainCtx, startX, startY, currentX, currentY, 5);
        } else if (tool === 'hexagon') {
            drawPolygon(mainCtx, startX, startY, currentX, currentY, 6);
        }

        // Reset start/end points after finishing the shape
        startX = null;
        startY = null;
        currentX = null;
        currentY = null;

        // Save state after shape is drawn
        history.saveState();
    } else if (tool !== 'marquee') {
        mainCtx.closePath();
        selectedArea = null;

        // Save state after drawing is complete
        history.saveState();
    }

    // Clear preview and update display
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    renderCanvas();
}

function clearCanvas() {
    mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    renderCanvas();

    // Clear history after canvas is cleared
    history.clearHistory();
}

function saveCanvas() {
    // Create a temporary canvas to combine all layers
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    // Draw the main canvas content
    tempCtx.drawImage(mainCanvas, 0, 0);

    // Apply layout and grid if they should be saved
    if (layout === 'two-column') {
        tempCtx.fillStyle = '#f0f0f0';
        tempCtx.fillRect(canvas.width / 2 - 2, 0, 4, canvas.height);
    }

    if (gridVisible) {
        tempCtx.strokeStyle = '#ddd';
        tempCtx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 20) {
            tempCtx.beginPath();
            tempCtx.moveTo(x, 0);
            tempCtx.lineTo(x, canvas.height);
            tempCtx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 20) {
            tempCtx.beginPath();
            tempCtx.moveTo(0, y);
            tempCtx.lineTo(canvas.width, y);
            tempCtx.stroke();
        }
    }

    // Detect if we're on mobile/tablet
    const isMobileOrTablet = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobileOrTablet) {
        // For mobile/tablet: open image in a new window/tab that can be saved
        try {
            const imageURL = tempCanvas.toDataURL('image/png');

            // Create a custom dialog for mobile saving
            const saveDialog = document.createElement('div');
            saveDialog.style.position = 'fixed';
            saveDialog.style.top = '0';
            saveDialog.style.left = '0';
            saveDialog.style.width = '100%';
            saveDialog.style.height = '100%';
            saveDialog.style.backgroundColor = 'rgba(0,0,0,0.8)';
            saveDialog.style.zIndex = '9999';
            saveDialog.style.display = 'flex';
            saveDialog.style.flexDirection = 'column';
            saveDialog.style.alignItems = 'center';
            saveDialog.style.justifyContent = 'center';

            // Add image preview
            const imgPreview = document.createElement('img');
            imgPreview.src = imageURL;
            imgPreview.style.maxWidth = '90%';
            imgPreview.style.maxHeight = '70vh';
            imgPreview.style.border = '2px solid white';
            imgPreview.style.borderRadius = '8px';
            imgPreview.style.marginBottom = '20px';

            // Add instructions
            const instructions = document.createElement('p');
            instructions.textContent = 'Press and hold the image, then select "Save Image"';
            instructions.style.color = 'white';
            instructions.style.margin = '10px';
            instructions.style.fontFamily = 'Arial, sans-serif';

            // Add close button
            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Close';
            closeBtn.style.padding = '10px 20px';
            closeBtn.style.marginTop = '20px';
            closeBtn.style.backgroundColor = '#4dabf7';
            closeBtn.style.color = 'white';
            closeBtn.style.border = 'none';
            closeBtn.style.borderRadius = '5px';
            closeBtn.style.cursor = 'pointer';
            closeBtn.onclick = () => document.body.removeChild(saveDialog);

            // Assemble dialog
            saveDialog.appendChild(imgPreview);
            saveDialog.appendChild(instructions);
            saveDialog.appendChild(closeBtn);
            document.body.appendChild(saveDialog);

        } catch (e) {
            console.error('Error saving image:', e);
            alert('There was an error saving your drawing. Please try again.');
        }
    } else {
        // For desktop: Show save dialog
        const link = document.createElement('a');

        // Let user choose image format with a simple dialog
        const formatDialog = document.createElement('div');
        formatDialog.style.position = 'fixed';
        formatDialog.style.top = '0';
        formatDialog.style.left = '0';
        formatDialog.style.width = '100%';
        formatDialog.style.height = '100%';
        formatDialog.style.backgroundColor = 'rgba(0,0,0,0.5)';
        formatDialog.style.zIndex = '9999';
        formatDialog.style.display = 'flex';
        formatDialog.style.alignItems = 'center';
        formatDialog.style.justifyContent = 'center';

        const dialogContent = document.createElement('div');
        dialogContent.style.backgroundColor = 'white';
        dialogContent.style.padding = '20px';
        dialogContent.style.borderRadius = '8px';
        dialogContent.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        dialogContent.style.width = '300px';
        dialogContent.style.textAlign = 'center';

        const dialogTitle = document.createElement('h3');
        dialogTitle.textContent = 'Save Drawing As';
        dialogTitle.style.marginTop = '0';

        const formatOptions = document.createElement('div');
        formatOptions.style.display = 'flex';
        formatOptions.style.justifyContent = 'space-around';
        formatOptions.style.margin = '20px 0';

        const formats = [
            { type: 'image/png', ext: 'png', label: 'PNG' },
            { type: 'image/jpeg', ext: 'jpg', label: 'JPEG' }
        ];

        formats.forEach(format => {
            const formatBtn = document.createElement('button');
            formatBtn.textContent = format.label;
            formatBtn.style.padding = '10px 20px';
            formatBtn.style.backgroundColor = '#4dabf7';
            formatBtn.style.color = 'white';
            formatBtn.style.border = 'none';
            formatBtn.style.borderRadius = '5px';
            formatBtn.style.cursor = 'pointer';
            formatBtn.style.margin = '0 5px';

            formatBtn.onclick = () => {
                try {
                    link.download = 'sketch-' + new Date().toISOString().slice(0, 10) + '.' + format.ext;
                    link.href = tempCanvas.toDataURL(format.type, 0.8);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    document.body.removeChild(formatDialog);
                } catch (e) {
                    console.error('Error saving image:', e);
                    alert('There was an error saving your drawing. Please try again.');
                    document.body.removeChild(formatDialog);
                }
            };

            formatOptions.appendChild(formatBtn);
        });

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.padding = '8px 15px';
        cancelBtn.style.backgroundColor = '#eee';
        cancelBtn.style.color = '#333';
        cancelBtn.style.border = 'none';
        cancelBtn.style.borderRadius = '5px';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.onclick = () => document.body.removeChild(formatDialog);

        // Assemble dialog
        dialogContent.appendChild(dialogTitle);
        dialogContent.appendChild(formatOptions);
        dialogContent.appendChild(cancelBtn);
        formatDialog.appendChild(dialogContent);
        document.body.appendChild(formatDialog);
    }
}
// Modified draw function to handle the pixel grid
function drawPixelatedLine(startX, startY, endX, endY) {
    // For 8-bit or 16-bit modes, we draw "blocky" pixels
    const points = getLinePoints(startX, startY, endX, endY);

    for (const point of points) {
        // Draw a rectangle for each pixel
        mainCtx.fillRect(
            Math.floor(point.x / canvasPixelSize) * canvasPixelSize,
            Math.floor(point.y / canvasPixelSize) * canvasPixelSize,
            canvasPixelSize,
            canvasPixelSize
        );
    }
}

// Get points along a line using Bresenham's line algorithm
function getLinePoints(x0, y0, x1, y1) {
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? canvasPixelSize : -canvasPixelSize;
    const sy = y0 < y1 ? canvasPixelSize : -canvasPixelSize;
    let err = dx - dy;

    let currentX = x0;
    let currentY = y0;

    while (true) {
        points.push({x: currentX, y: currentY});

        if (Math.abs(currentX - x1) < canvasPixelSize && Math.abs(currentY - y1) < canvasPixelSize) break;

        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            currentX += sx;
        }
        if (e2 < dx) {
            err += dx;
            currentY += sy;
        }
    }

    return points;
}

// Modified fill area for pixelated modes
function pixelatedFill(x, y) {
    // For pixelated modes, we want to fill in blocks rather than individual pixels
    x = Math.floor(x / canvasPixelSize) * canvasPixelSize;
    y = Math.floor(y / canvasPixelSize) * canvasPixelSize;

    // Standard fill operation with adjusted coordinates
    fillArea(x, y);
}

// Update the applyLayoutAndGrid function to use different grid sizes based on layout
function applyLayoutAndGrid(targetCtx) {
    // Draw layout specifics
    if (layout === 'two-column') {
        targetCtx.fillStyle = '#f0f0f0';
        targetCtx.fillRect(canvas.width / 2 - 2, 0, 4, canvas.height);
    }

    // Draw grid if visible
    if (gridVisible) {
        if (layout === '8-bit') {
            // Draw 8-bit grid (larger pixels)
            targetCtx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
            targetCtx.lineWidth = 1;

            // Draw vertical grid lines
            for (let x = 0; x <= canvas.width; x += canvasPixelSize) {
                targetCtx.beginPath();
                targetCtx.moveTo(x, 0);
                targetCtx.lineTo(x, canvas.height);
                targetCtx.stroke();
            }

            // Draw horizontal grid lines
            for (let y = 0; y <= canvas.height; y += canvasPixelSize) {
                targetCtx.beginPath();
                targetCtx.moveTo(0, y);
                targetCtx.lineTo(canvas.width, y);
                targetCtx.stroke();
            }
        }
        else if (layout === '16-bit') {
            // Draw 16-bit grid (medium pixels)
            targetCtx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
            targetCtx.lineWidth = 0.5;

            // Draw vertical grid lines
            for (let x = 0; x <= canvas.width; x += canvasPixelSize) {
                targetCtx.beginPath();
                targetCtx.moveTo(x, 0);
                targetCtx.lineTo(x, canvas.height);
                targetCtx.stroke();
            }

            // Draw horizontal grid lines
            for (let y = 0; y <= canvas.height; y += canvasPixelSize) {
                targetCtx.beginPath();
                targetCtx.moveTo(0, y);
                targetCtx.lineTo(canvas.width, y);
                targetCtx.stroke();
            }
        }
        else {
            // Draw standard grid for other layouts
            targetCtx.strokeStyle = '#ddd';
            targetCtx.lineWidth = 1;
            for (let x = 0; x < canvas.width; x += 20) {
                targetCtx.beginPath();
                targetCtx.moveTo(x, 0);
                targetCtx.lineTo(x, canvas.height);
                targetCtx.stroke();
            }
            for (let y = 0; y < canvas.height; y += 20) {
                targetCtx.beginPath();
                targetCtx.moveTo(0, y);
                targetCtx.lineTo(canvas.width, y);
                targetCtx.stroke();
            }
        }
    }
}

function renderCanvas(isPreview = false) {
    // Clear the main display canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // If we're previewing, draw from preview canvas
    if (isPreview) {
        ctx.drawImage(previewCanvas, 0, 0);
    } else {
        // Otherwise draw from main canvas and apply layout/grid
        ctx.drawImage(mainCanvas, 0, 0);
        applyLayoutAndGrid(ctx);
    }
}

function drawCanvas() {
    renderCanvas();
}

function setupEventListeners() {
    // Set up tool selection event listeners
    Object.keys(toolCategories).forEach(category => {
        toolCategories[category].forEach(toolId => {
            const toolBtn = document.getElementById(toolId);
            if (toolBtn) {
                toolBtn.addEventListener('click', () => {
                    tool = toolId;
                    updateActiveTool();
                });
            } else {
                console.warn(`Tool button with ID '${toolId}' not found in the DOM`);
            }
        });
    });

    // Set up color swatches
    const colorPalette = document.getElementById('colorPalette');
    if (colorPalette) {
        colors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.addEventListener('click', () => {
                currentColor = color;
                updateColorSwatches();
            });
            colorPalette.appendChild(swatch);
        });
    }

    // Set up other UI elements
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker) {
        colorPicker.addEventListener('input', (e) => {
            currentColor = e.target.value;
            updateColorSwatches();
        });
    }

    const hexInput = document.getElementById('hexInput');
    if (hexInput) {
        hexInput.addEventListener('input', (e) => {
            const hex = e.target.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                currentColor = hex;
                updateColorSwatches();
            }
        });
    }

    // Action buttons
    const clearBtn = document.getElementById('clear');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCanvas);
    }

    const saveBtn = document.getElementById('save');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveCanvas);
    }

    // Set up undo and redo buttons
    const undoBtn = document.getElementById('undo');
    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            if (!undoBtn.classList.contains('disabled')) {
                history.undo();
                renderCanvas();
            }
        });
    }

    const redoBtn = document.getElementById('redo');
    if (redoBtn) {
        redoBtn.addEventListener('click', () => {
            if (!redoBtn.classList.contains('disabled')) {
                history.redo();
                renderCanvas();
            }
        });
    }

    // Sliders with value displays
    const opacitySlider = document.getElementById('opacity');
    const thicknessSlider = document.getElementById('thickness');
    const opacityValue = document.getElementById('opacityValue');
    const thicknessValue = document.getElementById('thicknessValue');

    if (opacitySlider && opacityValue) {
        opacitySlider.addEventListener('input', (e) => {
            opacity = e.target.value;
            opacityValue.textContent = Math.round(opacity * 100) + '%';
        });
    }

    if (thicknessSlider && thicknessValue) {
        thicknessSlider.addEventListener('input', (e) => {
            thickness = parseInt(e.target.value);
            thicknessValue.textContent = thickness + 'px';
        });
    }

    const gridCheckbox = document.getElementById('grid');
    if (gridCheckbox) {
        gridCheckbox.addEventListener('change', (e) => {
            gridVisible = e.target.checked;
            drawCanvas();
        });
    }

    const layoutSelect = document.getElementById('layout');
    if (layoutSelect) {
        // Update initial value
        layoutSelect.value = layout;

        // Add change event listener
        layoutSelect.addEventListener('change', (e) => {
            const newLayout = e.target.value;

            // Only apply changes if the layout actually changed
            if (newLayout !== layout) {
                // Confirm layout change as it will clear the canvas
                if (confirm('Changing layout will clear your current drawing. Continue?')) {
                    setCanvasLayout(newLayout);
                } else {
                    // Reset dropdown to current layout if user cancels
                    layoutSelect.value = layout;
                }
            }
        });
    }

    // Add keyboard shortcuts for undo/redo
    document.addEventListener('keydown', (e) => {
        // Check if ctrl or cmd key is pressed
        if (e.ctrlKey || e.metaKey) {
            // Undo: Ctrl+Z
            if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (!undoBtn.classList.contains('disabled')) {
                    history.undo();
                    renderCanvas();
                }
            }
            // Redo: Ctrl+Y or Ctrl+Shift+Z
            if ((e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                if (!redoBtn.classList.contains('disabled')) {
                    history.redo();
                    renderCanvas();
                }
            }
        }
    });

    // Initialize values on UI elements
    if (opacityValue) opacityValue.textContent = Math.round(opacity * 100) + '%';
    if (thicknessValue) thicknessValue.textContent = thickness + 'px';
    if (gridCheckbox) gridCheckbox.checked = gridVisible;
    if (layoutSelect) layoutSelect.value = layout;
}

// Add this to your existing updateActiveTool function
function updateActiveTool() {
    console.log('Updating active tool:', tool);

    // Remove active class from all tools
    allTools.forEach(t => {
        const btn = document.getElementById(t);
        if (btn) {
            btn.classList.remove('active');
        }
    });

    // Add active class to selected tool
    const activeToolBtn = document.getElementById(tool);
    if (activeToolBtn) {
        activeToolBtn.classList.add('active');
        console.log('Set active class on:', tool);
    } else {
        console.warn(`Could not find button element for tool: ${tool}`);
    }

    // Update cursor style based on the selected tool
    updateCursorStyle();
}


function updateColorSwatches() {
    // Update active swatch
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        const swatchColor = swatch.style.backgroundColor;
        const isActive = colorToHex(swatchColor) === currentColor.toLowerCase();
        swatch.classList.toggle('active', isActive);
    });

    // Update color inputs
    const colorPicker = document.getElementById('colorPicker');
    const hexInput = document.getElementById('hexInput');

    if (colorPicker) colorPicker.value = currentColor;
    if (hexInput) hexInput.value = currentColor;
}

// Helper function to convert RGB to hex
function colorToHex(color) {
    // If already in hex format
    if (color.startsWith('#')) return color.toLowerCase();

    // Handle rgb/rgba format
    if (color.startsWith('rgb')) {
        const digits = color.match(/\d+/g).map(Number);
        let r = digits[0].toString(16).padStart(2, '0');
        let g = digits[1].toString(16).padStart(2, '0');
        let b = digits[2].toString(16).padStart(2, '0');
        return `#${r}${g}${b}`.toLowerCase();
    }

    return color.toLowerCase();
}

// Initial setup
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');

    // Set initial layout to portrait
    layout = 'portrait';

    // Initialize history manager with mainCanvas
    history = new CanvasHistory(mainCanvas);

    // Initialize the canvas with the default layout
    setCanvasLayout(layout);

    // Setup all event listeners
    setupEventListeners();
    updateActiveTool();
    updateColorSwatches();

});
