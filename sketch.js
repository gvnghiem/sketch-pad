const canvas = document.getElementById('sketchCanvas');
const ctx = canvas.getContext('2d');

// Set canvas to A4 size (595x842px, scaled to fit screen)
canvas.width = 595;
canvas.height = 842;

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

// Toolbar elements
const tools = ['pen', 'pencil', 'paint', 'line', 'circle', 'rect', 'marquee'];
tools.forEach(t => {
    document.getElementById(t).addEventListener('click', () => {
        tool = t;
        updateActiveTool();
    });
});

const colors = [
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#000000', '#FFFFFF'
];

colors.forEach(color => {
    const swatch = document.createElement('div');
    swatch.style.backgroundColor = color;
    swatch.style.width = '20px';
    swatch.style.height = '20px';
    swatch.style.display = 'inline-block';
    swatch.style.cursor = 'pointer';
    swatch.style.margin = '2px';
    swatch.addEventListener('click', () => {
        currentColor = color;
        updateColorSwatches();
    });
    document.getElementById('colorPalette').appendChild(swatch);
});

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
document.getElementById('layout').addEventListener('change', (e) => {
    layout = e.target.value;
    drawCanvas();
});

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
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function startDrawing(e) {
    drawing = true;
    const coords = getCanvasCoordinates(e);
    startX = coords.x;
    startY = coords.y;

    if (tool === 'marquee') {
        selectedArea = { x: startX, y: startY, width: 0, height: 0 };
    } else if (tool !== 'line' && tool !== 'circle' && tool !== 'rect') {
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
    previewCtx.globalAlpha = opacity;
    previewCtx.lineWidth = thickness;
    previewCtx.strokeStyle = currentColor;

    if (tool === 'pen') {
        mainCtx.lineCap = 'round';
        mainCtx.lineTo(currentX, currentY);
        mainCtx.stroke();
        renderCanvas();
    } else if (tool === 'pencil') {
        mainCtx.lineCap = 'round';
        mainCtx.globalAlpha = opacity * 0.5;
        mainCtx.lineTo(currentX, currentY);
        mainCtx.stroke();
        renderCanvas();
    } else if (tool === 'paint') {
        mainCtx.lineCap = 'round';
        mainCtx.lineWidth = thickness * 2;
        mainCtx.lineTo(currentX, currentY);
        mainCtx.stroke();
        renderCanvas();
    } else if (tool === 'line' || tool === 'circle' || tool === 'rect') {
        // Use preview canvas for shape drawing
        drawPreview();
    } else if (tool === 'marquee') {
        selectedArea.width = currentX - startX;
        selectedArea.height = currentY - startY;
        drawPreview();
    }
}

function drawPreview() {
    // Clear the preview canvas
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // Draw existing content from main canvas
    previewCtx.drawImage(mainCanvas, 0, 0);
    
    // Draw preview of current shape
    if (tool === 'line') {
        previewCtx.beginPath();
        previewCtx.moveTo(startX, startY);
        previewCtx.lineTo(currentX, currentY);
        previewCtx.stroke();
    } else if (tool === 'circle') {
        const radius = Math.sqrt((currentX - startX) ** 2 + (currentY - startY) ** 2);
        previewCtx.beginPath();
        previewCtx.arc(startX, startY, radius, 0, Math.PI * 2);
        previewCtx.stroke();
    } else if (tool === 'rect') {
        previewCtx.beginPath();
        previewCtx.strokeRect(startX, startY, currentX - startX, currentY - startY);
    } else if (tool === 'marquee') {
        previewCtx.setLineDash([5, 5]);
        previewCtx.strokeRect(startX, startY, selectedArea.width, selectedArea.height);
        previewCtx.setLineDash([]);
    }
    
    // Apply layout and grid to preview
    applyLayoutAndGrid(previewCtx);
    
    // Render the preview to main canvas
    renderCanvas(true);
}

function stopDrawing() {
    if (!drawing) return;
    drawing = false;
    
    if (tool === 'line' || tool === 'circle' || tool === 'rect') {
        // Commit the shape to the main canvas
        mainCtx.globalAlpha = opacity;
        mainCtx.lineWidth = thickness;
        mainCtx.strokeStyle = currentColor;
        
        if (tool === 'line') {
            mainCtx.beginPath();
            mainCtx.moveTo(startX, startY);
            mainCtx.lineTo(currentX, currentY);
            mainCtx.stroke();
        } else if (tool === 'circle') {
            const radius = Math.sqrt((currentX - startX) ** 2 + (currentY - startY) ** 2);
            mainCtx.beginPath();
            mainCtx.arc(startX, startY, radius, 0, Math.PI * 2);
            mainCtx.stroke();
        } else if (tool === 'rect') {
            mainCtx.beginPath();
            mainCtx.strokeRect(startX, startY, currentX - startX, currentY - startY);
        }
    } else if (tool !== 'marquee') {
        mainCtx.closePath();
        selectedArea = null;
    }
    
    // Clear preview and update display
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    renderCanvas();
}

function clearCanvas() {
    mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    renderCanvas();
}

function applyLayoutAndGrid(targetCtx) {
    // Draw layout
    if (layout === 'two-column') {
        targetCtx.fillStyle = '#f0f0f0';
        targetCtx.fillRect(canvas.width / 2 - 2, 0, 4, canvas.height);
    }

    // Draw grid
    if (gridVisible) {
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

// Initial setup
updateActiveTool();
updateColorSwatches();
drawCanvas();
