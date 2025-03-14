# Sketch Pad

A lightweight sketching application built with JavaScript and HTML5 Canvas, inspired by tools like Procreate. Draw, sketch, and create with a simple set of tools and customizable options, all within your browser!

## Live Demo
Try it out here: [https://gvnghiem.github.io/sketch-pad/](https://gvnghiem.github.io/sketch-pad/)

## Features
- **Tools:**
  - **Pen:** Smooth freehand drawing with adjustable opacity and thickness.
  - **Pencil:** Lighter, textured freehand drawing (reduced opacity for a pencil-like effect).
  - **Paint:** Wide brush strokes for bold painting (doubled thickness).
  - **Line:** Draw straight lines between two points with a live preview.
  - **Shapes:** Circle and Rectangle tools for precise outlines.
  - **Marquee:** Select areas with a dashed outline (basic selection tool).
- **Options:**
  - **Opacity:** Adjustable from 0 (transparent) to 1 (opaque) via a slider.
  - **Thickness:** Line width from 1px to 20px via a slider.
  - **Color Palette:** Choose from 8 standard colors (red, green, blue, yellow, magenta, cyan, black, white) with clickable swatches.
  - **Custom Colors:** Select any color using a native color picker or input a hex code (e.g., `#FF5733`) manually.
  - **Grid View:** Toggle a 20x20px grid for precision drawing.
  - **Layouts:** Choose between a blank canvas or a two-column layout with a vertical divider.
- **Canvas:** Standard A4 size (595x842px), scaled to fit most screens.
- **Controls:** Use your mouse to draw, select tools via buttons, and adjust settings with sliders and color inputs.

## Screenshots
![Sketch Pad in Action](screenshot.png)

## Setup Instructions
1. **Clone the Repository:**
   ```bash
   git clone https://github.com/gvnghiem/sketch-pad.git
   cd sketch-pad
