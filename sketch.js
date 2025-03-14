const canvas = document.getElementById('sketchCanvas');
const ctx = canvas.getContext('2d');

// Set canvas to A4 size (595x842px, scaled to fit screen)
canvas.width = 595;
canvas.height = 842;

// Tool variables
let tool = 'pen'; // Default tool
let drawing = false;
let startX, startY, currentX, currentY;
let opacity = 1;
let thickness = 5;
let gridVisible = false;
let layout = 'blank';
let selectedArea = null;
let currentColor = '#000000'; // Default color (black)

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

// Standard color palette
const colors = [
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#000000', // Black
    '#FFFFFF'  // White
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
    document.getElementById('colorPalette').appendChild(swatch); // Assumes a <div id="colorPalette"> in HTML
});

// Custom color input
document.getElementById('colorPicker').addEventListener('input', (e) => {
    currentColor = e.target.value;
    updateColorSwatches();
});
document.getElementById('hexInput').addEventListener('input', (e) => {
    const hex = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) { // Validate hex code
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

// Update active tool button styling
function updateActiveTool() {
    tools.forEach(t => {
        const btn = document.getElementById(t);
        btn.classList.toggle('active', t === tool);
    });
}

// Update color swatches to indicate active color
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

// Drawing functions
function startDrawing(e) {
    drawing = true;
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;

    if (tool === 'marquee') {
        selectedArea = { x: startX, y: startY, width: 0, height: 0 };
    } else {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
    }
}

function draw(e) {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    currentX = e.clientX - rect.left;
    currentY = e.clientY - rect.top;

    ctx.globalAlpha = opacity;
    ctx.lineWidth = thickness;
    ctx.strokeStyle = currentColor; // Use selected color

    if (tool === 'pen') {
        ctx.lineCap = 'round';
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
    } else if (tool === 'pencil') {
        ctx.lineCap = 'round';
        ctx.globalAlpha = opacity * 0.5;
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
    } else if (tool === 'paint') {
        ctx.lineCap = 'round';
        ctx.lineWidth = thickness * 2;
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
    } else if (tool === 'line') {
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCtx.globalAlpha = opacity;
        previewCtx.lineWidth = thickness;
        previewCtx.strokeStyle = currentColor; // Use selected color
        previewCtx.beginPath();
        previewCtx.moveTo(startX, startY);
        previewCtx.lineTo(currentX, currentY);
        previewCtx.stroke();

        drawCanvas();
        ctx.drawImage(previewCanvas, 0, 0);
    } else if (tool === 'circle' || tool === 'rect' || tool === 'marquee') {
        drawCanvas();
        if (tool === 'circle') {
            const radius = Math.sqrt((currentX - startX) ** 2 + (currentY - startY) ** 2);
            ctx.beginPath();
            ctx.arc(startX, startY, radius, 0, Math.PI * 2);
            ctx.stroke();
        } else if (tool === 'rect') {
            ctx.beginPath();
            ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
        } else if (tool === 'marquee') {
            selectedArea.width = currentX - startX;
            selectedArea.height = currentY - startY;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
            ctx.setLineDash([]);
        }
    }
}

function stopDrawing() {
    if (drawing) {
        drawing = false;
        ctx.globalAlpha = opacity;
        ctx.lineWidth = thickness;
        ctx.strokeStyle = currentColor; // Use selected color

        if (tool === 'line') {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            drawCanvas();
        } else if (tool !== 'marquee') {
            ctx.closePath();
            selectedArea = null;
        }
    }
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCanvas();
}

function drawCanvas() {
    if (!drawing || tool !== 'line') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (layout === 'two-column') {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(canvas.width / 2 - 2, 0, 4, canvas.height);
    }

    if (gridVisible) {
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 20) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 20) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }
}

// Initial setup
updateActiveTool();
updateColorSwatches();
drawCanvas();
