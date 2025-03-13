const canvas = document.getElementById('sketchCanvas');
const ctx = canvas.getContext('2d');

// Set canvas to A4 size (595x842px, scaled to fit screen)
canvas.width = 595;
canvas.height = 842;

// Tool variables
let tool = 'pen'; // Default tool
let drawing = false;
let startX, startY;
let opacity = 1;
let thickness = 5;
let gridVisible = false;
let layout = 'blank';
let selectedArea = null;

// Toolbar elements
const tools = ['pen', 'pencil', 'paint', 'line', 'circle', 'rect', 'marquee'];
tools.forEach(t => {
    document.getElementById(t).addEventListener('click', () => {
        tool = t;
        updateActiveTool();
    });
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.globalAlpha = opacity;
    ctx.lineWidth = thickness;
    ctx.strokeStyle = '#000';

    if (tool === 'pen') {
        ctx.lineCap = 'round';
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if (tool === 'pencil') {
        ctx.lineCap = 'round';
        ctx.globalAlpha = opacity * 0.5; // Lighter for pencil effect
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if (tool === 'paint') {
        ctx.lineCap = 'round';
        ctx.lineWidth = thickness * 2; // Wider for paint
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if (tool === 'line') {
        drawCanvas();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if (tool === 'circle' || tool === 'rect' || tool === 'marquee') {
        drawCanvas();
        if (tool === 'circle') {
            const radius = Math.sqrt((x - startX) ** 2 + (y - startY) ** 2);
            ctx.beginPath();
            ctx.arc(startX, startY, radius, 0, Math.PI * 2);
            ctx.stroke();
        } else if (tool === 'rect') {
            ctx.beginPath();
            ctx.strokeRect(startX, startY, x - startX, y - startY);
        } else if (tool === 'marquee') {
            selectedArea.width = x - startX;
            selectedArea.height = y - startY;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(startX, startY, x - startX, y - startY);
            ctx.setLineDash([]);
        }
    }
}

function stopDrawing() {
    if (drawing) {
        drawing = false;
        ctx.closePath();
        if (tool !== 'marquee') {
            selectedArea = null; // Reset marquee after drawing shapes
        }
    }
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCanvas();
}

function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw layout
    if (layout === 'two-column') {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(canvas.width / 2 - 2, 0, 4, canvas.height);
    }

    // Draw grid
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
drawCanvas();